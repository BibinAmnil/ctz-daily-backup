(function () {
  if (window.UISchemaFactory) {
    delete window.UISchemaFactory;
  }
  class UISchemaFactory {
    constructor(masterDataUrl, options = {}) {
      this.axios = options.axios;
      this.mainRouteURL = options.mainRouteURL;
      this.form_status = options.form_status;
      this.optionsData = options.optionsData;
      this.setOptionsData = options.setOptionsData;
      this.formData = options.formData;
      this.setFormData = options.setFormData;
      this.setJsonSchema = options.setJsonSchema;
      this.setDivide = options.setDivide;
      this.setUiSchema = options.setUiSchema;
      this.adToBs = options.adToBs;
      this.bsToAd = options.bsToAd;
      this.masterDataUrl = masterDataUrl;
      this.isMasterDataLoaded = false;
      this.setNextStep = options.setNextStep;
      this.schemaConditions = options.schemaConditions;
      this.hasUpdated = options.hasUpdated;
      this.case_id = options.case_id;
      this.toast = options.toast;
      this.functionGroup = options.functionGroup;
    }

    filterOptions(key, cascadeValue) {
      if (!this.optionsData[key]) return [];

      const filteredOptions = cascadeValue
        ? this.optionsData[key]?.filter((item) =>
            item.cascade_id?.includes(cascadeValue)
          ) || []
        : this.optionsData[key];

      return filteredOptions.map((item) => ({
        label: item.title,
        value: item?.fg_code || item?.cbs_code || item?.id,
      }));
    }

    filterOptionsByCascadeId(options, cascadeId) {
      const filteredOptions = options.filter(
        (option) => option.cascade_id == cascadeId
      );

      return filteredOptions;
    }

    async updateSchemaWithEnums(
      fieldKey,
      optionsData,
      setJsonSchema,
      cascadeId = null
    ) {
      const fieldMapping = {
        nationality: "nationalities",
        permanent_country: "countries",
        permanent_province: "provinces",
        permanent_district: "districts",
        family_member_relation: "relationships",
        beneficial_relationship: "relationships",
        occupation_type: "occupations",
        source_of_income: "income_sources",
        relation_with_account_holder: "relationships",
        family_account_holder: "relationship_status",
        business_type: "business_type",
        existing_risk_rating: "risk_categories",
        account_info: "account_category",
        hpp_category: "hpp_categories",
        hpp_sub_category: "hpp_sub_categories",
      };
      const dataKey = fieldMapping[fieldKey] || fieldKey;
      let fieldOptions = optionsData[dataKey] || [];

      if (cascadeId !== null) {
        fieldOptions = this.filterOptionsByCascadeId(fieldOptions, cascadeId);
      }

      const enumValues = Array.from(
        new Set(
          fieldOptions.map((item) =>
            String(item?.fg_code || item?.cbs_code || item?.id)
          )
        )
      );

      // fieldOptions.map((option) => String(option.id));
      const enumNames = fieldOptions.map((option) => option.title);

      this.setFormData((prevData) => ({ ...prevData }));
      setJsonSchema((prevSchema) => {
        if (!prevSchema || !prevSchema.properties) {
          return prevSchema;
        }

        const updateProperties = (schema) => {
          if (!schema || !schema.properties) return;

          for (const key in schema.properties) {
            const field = schema.properties[key];

            if (
              key === fieldKey &&
              (field.type === "string" || field.type === "array")
            ) {
              field.enum = [...enumValues];
              //field.enumNames = [...enumNames];
              field.selectOptions = enumValues.map((value, index) => ({
                value,
                label: enumNames[index],
              }));
            }

            if (field.type === "object" && field.properties) {
              updateProperties(field);
            }

            if (field.type === "array" && field.items?.properties) {
              updateProperties(field.items);
            }
          }

          // Handling dependencies or conditional schemas
          if (schema.dependencies) {
            for (const depKey in schema.dependencies) {
              const dependency = schema.dependencies[depKey];
              if (dependency.properties) {
                updateProperties(dependency);
              } else if (dependency.oneOf || dependency.anyOf) {
                (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
                  if (depSchema.properties) updateProperties(depSchema);
                });
              } else if (dependency.if) {
                if (dependency.then) updateProperties(dependency.then);
                if (dependency.else) updateProperties(dependency.else);
              }
            }
          }
        };

        const updatedSchema = { ...prevSchema };

        updateProperties(updatedSchema);
        return updatedSchema;
      });
    }

    async calculateRisk(formData) {
      try {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          calculate_risk: {
            ...prevUiSchema.calculate_risk,
            "ui:options": {
              ...prevUiSchema.calculate_risk?.["ui:options"],
              show_loader: true,
            },
          },
        }));
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...formData,
            category: "individual",
            id: this.case_id,
            get_average: true,
          }
        );

        if (response) {
          this.toast.success("Risk calculation successful");
          const resp = response?.data;

          this.setFormData((prevData) => ({
            ...prevData,
            risk_level: resp?.risk_level,
            risk_score: resp?.risk_score,
            is_high_risk_acc: resp?.is_high_risk_acc,
            is_high_risk_account: resp?.is_high_risk_acc ? "Yes" : "No",
          }));

          if (resp?.is_high_risk_acc) {
            this.setNextStep("personal-ncna-ecdd-form");
            setTimeout(() => {
              this.setJsonSchema((prevJsonSchema) => ({
                ...prevJsonSchema,
                hasStep: true,
                isDisabled: false,
              }));
            }, 100);
          } else {
            setTimeout(() => {
              this.setJsonSchema((prevJsonSchema) => ({
                ...prevJsonSchema,
                hasStep: false,
                isDisabled: false,
              }));
            }, 100);
          }
        }

        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        this.toast.error(error?.response?.data?.message);
        return {};
      } finally {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          calculate_risk: {
            ...prevUiSchema.calculate_risk,
            "ui:options": {
              ...prevUiSchema.calculate_risk?.["ui:options"],
              show_loader: false,
            },
          },
        }));
      }
    }

    updateFieldsBasedOnConditions(formData, setJsonSchema) {
      setJsonSchema((prevSchema) => {
        if (!prevSchema || !prevSchema.properties) {
          return prevSchema;
        }

        const updatedProperties = {
          ...prevSchema.properties,
        };
        return {
          ...prevSchema,
          properties: updatedProperties,
        };
      });
    }

    async updateMinItemsForArrays(schema, formData) {
      if (!schema || !schema.properties) return;

      for (const key in schema.properties) {
        const field = schema.properties[key];

        // Check if the field is an array and has items
        if (field.type === "array" && field.items) {
          field.minItems = formData[key]?.length > 0 ? formData[key].length : 1;

          // If array contains objects, check for nested arrays
          if (field.items.type === "object" && field.items.properties) {
            formData[key]?.forEach((item) => {
              if (
                item.related_party_detail &&
                field.items.properties.related_party_detail
              ) {
                field.items.properties.related_party_detail.minItems =
                  item.related_party_detail.length > 0
                    ? item.related_party_detail.length
                    : 1;
              }
            });
          }
        }

        if (field.type === "object" && field.properties) {
          this.updateMinItemsForArrays(field, formData);
        }

        if (field.type === "array" && field.items?.properties) {
          this.updateMinItemsForArrays(field.items, formData);
        }
      }

      // Handle dependencies (if exists)
      if (schema.dependencies) {
        for (const depKey in schema.dependencies) {
          const dependency = schema.dependencies[depKey];

          if (dependency.properties) {
            this.updateMinItemsForArrays(dependency, formData);
          } else if (dependency.oneOf || dependency.anyOf) {
            (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
              if (depSchema.properties)
                this.updateMinItemsForArrays(depSchema, formData);
            });
          } else if (dependency.if) {
            if (dependency.then)
              this.updateMinItemsForArrays(dependency.then, formData);
            if (dependency.else)
              this.updateMinItemsForArrays(dependency.else, formData);
          }
        }
      }
    }

    async initializeSchema(setJsonSchema, formData) {
      this.formData = formData;

      this.setFormData((prevData) => ({
        ...prevData,
        is_high_risk_account: formData?.is_high_risk_acc ? "Yes" : "No",
      }));

      if (!this.form_status?.includes("case-init")) {
        this.setDivide(true);
      }

      const fieldsToUpdate = [
        "business_type",
        "permanent_country",
        "permanent_province",
        "nationality",
        "permanent_district",
        "family_member_relation",
        "relation_with_account_holder",
        "family_account_holder",
        "existing_risk_rating",
        "account_info",
        "beneficial_relationship",
        "occupation_type",
        "source_of_income",
        "hpp_category",
        "hpp_sub_category",
      ];

      for (const fieldKey of fieldsToUpdate) {
        this.updateSchemaWithEnums(fieldKey, this.optionsData, setJsonSchema);
      }

      // Update fields based on conditions
      this.updateFieldsBasedOnConditions(formData, setJsonSchema);
    }

    async updateFormAndSchema(formData, schemaConditions) {
      if (this.functionGroup?.areObjectsEqual(formData, this.formData)) {
        this.setJsonSchema((prevJsonSchema) => {
          return {
            ...prevJsonSchema,
            isDisabled: true,
          };
        });
      }
      this.formData = formData;
      if (
        this.form_status?.includes("review") &&
        (this.formData?.risk_level?.includes("High") ||
          this.formData?.is_high_risk_account === "Yes")
      ) {
        this.setJsonSchema((prevSchema) => {
          if (!prevSchema) return prevSchema;

          return {
            ...prevSchema,
            isDisabled: false,
            hasStep: true,
          };
        });
        this.setNextStep("personal-ncna-ecdd-form");

        return null;
      } else if (
        this.form_status?.includes("review") ||
        (this.form_status?.includes("approval") && !this.hasUpdated.current)
      ) {
        this.hasUpdated.current = true;
        this.setJsonSchema((prevSchema) => {
          if (!prevSchema) return prevSchema;

          return {
            ...prevSchema,
            isDisabled: false,
            required: [
              ...(this.form_status?.includes("approval")
                ? ["acknowledge"]
                : []),
              ...new Set([
                ...(prevSchema.required || []),
                "approval_status",
                "approval_remarks",
              ]),
            ],
          };
        });
      } else if (
        this.formData?.current_step?.includes("Completed") &&
        (!this.formData?.risk_level?.includes("High") ||
          this.formData?.is_high_risk_account === "No")
      ) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: false,
          submissionHidden: true,
        }));
      } else if (
        this.formData?.current_step?.includes("Completed") &&
        (this.formData?.risk_level?.includes("High") ||
          this.formData?.is_high_risk_account === "Yes")
      ) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: true,
          isDisabled: false,
        }));
      }
    }
    filterOptionsOccupation(key, childKey, cascadeValue) {
      if (!this.optionsData[key]) return [];

      const filteredOptions = cascadeValue
        ? this.optionsData[key][childKey]?.filter((item) =>
            item.cascade_id?.includes(cascadeValue)
          ) || []
        : this.optionsData[key][childKey];
      return filteredOptions
        ?.filter((item) => item?.id !== "remaining all occopation code")
        ?.map((item) => ({
          label: item.title,
          value: item?.fg_code || item?.cbs_code || item?.id,
        }));
    }

    createUISchema(options) {
      const {
        setJsonSchema,
        formData,
        jsonSchema,
        ObjectFieldTemplate,
        ArrayFieldTemplate,
        widgets,
      } = options;

      this.hasUpdated.current = false;

      this.initializeSchema(setJsonSchema, formData);
      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": [
          "hpp",
          "hpp_category",
          "hpp_sub_category",
          "pep",
          "pep_category",
          "pep_declaration",
          "family_pep_declaration",
          "adverse_media",
          "adverse_category",
          "nationality",
          "permanent_country",
          "permanent_province",
          "permanent_district",
          "permanent_outside_town",
          "permanent_outside_street_name",
          "permanent_postal_code",
          "has_related_party",
          "related_party",
          "related_party_detail",
          "entitled_with_fund",
          "occupation_type",
          "source_of_income",
          "occupation_detail",
          "business_type",
          "existing_risk_rating",
          "loan_status",
          "is_blacklisted",
          "customer_introduce_by",
          "introducer_account_number",
          "customer_name",
          "employee_id",
          "met_in_person",

          "annual_volume_of_transactions",
          "annual_number_of_transactions",
          "monthly_volume_of_transactions",
          "monthly_number_of_transactions",
          "yearly_income",
          "transaction_justification",
          "transaction_fund_details",

          "risk_level",
          "is_high_risk_account",
          "calculate_risk",
          "risk_score",
          "acknowledge",
          "approval_status",
          "approval_remarks",
          "account_info",
          "is_sanction",
          "is_cib_list",
          "is_block_list",
        ],
        related_party: {
          "ui:options": {
            fieldKeys: [
              "designation",
              "first_name",
              "middle_name",
              "last_name",
              "family_account_holder",
              "relation_with_account_holder",
              "related_party_detail",
            ],
          },
          "ui:options": {
            addable: false,
            removable: false,
          },
          items: {
            "ui:order": [
              "designation",
              "first_name",
              "middle_name",
              "last_name",
              "family_account_holder",
              "relation_with_account_holder",
              "related_party_detail",
            ],
            related_party_detail: {
              "ui:options": {
                addable: false,
                removable: false,
              },
              items: {
                "ui:order": [
                  "designation",
                  "first_name",
                  "middle_name",
                  "last_name",
                  "family_account_holder",
                  "relation_with_account_holder",
                ],
              },
            },
          },
        },
        has_related_party: {
          "ui:widget": "hidden",
        },
        account_info: {
          "ui:widget": "hidden",
        },

        is_sanction: {
          "ui:widget": "hidden",
        },
        is_cib_list: {
          "ui:widget": "hidden",
        },
        is_block_list: {
          "ui:widget": "hidden",
        },

        hpp_sub_category: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "hpp_sub_categories",
                formData?.hpp_category
              );
            },
          },
        },

        annual_volume_of_transactions: {
          "ui:options": {
            amount: true,
          },
        },
        monthly_volume_of_transactions: {
          "ui:options": {
            amount: true,
          },
        },
        yearly_income: {
          "ui:options": {
            amount: true,
          },
        },

        occupation_type: {
          // "ui:widget": "CascadeDropdown",
          "ui:options": {
            // getOptions: (formData) => {
            //   return this.filterOptionsOccupation(
            //     "occupation_rule",
            //     "occupation_list"
            //   );
            // },
            // onChange: (value) =>
            //   this.dropdownReset({
            //     occupation_type: value,
            //     source_of_income: this.optionsData["occupation_rule"]?.[
            //       `source_of_income_list`
            //     ]?.find((item) => item?.cascade_id?.includes(value))?.id,
            //   }),
          },
        },

        source_of_income: {
          // "ui:widget": "CascadeDropdown",
          "ui:options": {
            // getOptions: (formData) => {
            //   return this.filterOptionsOccupation(
            //     "occupation_rule",
            //     "source_of_income_list",
            //     formData?.occupation_type
            //   );
            // },
          },
        },

        occupation_detail: {
          "ui:classNames": "my-1",
          "ui:options": {
            addable: false,
            orderable: false,
            removable: false,
          },

          items: {
            designation: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => this.filterOptions("corporate_relation"),
              },
            },
            business_type: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  const filteredData = this.filterOptionsOccupation(
                    "occupation_rule",
                    "business_type_list",
                    formData?.occupation_type
                  );
                  return [
                    ...filteredData,
                    { label: "Others", value: "others" },
                  ];
                },
              },
            },
          },
        },

        risk_score: {
          "ui:widget": "hidden",
        },

        calculate_risk: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonField"
            : "hidden",
          "ui:label": false,
          "ui:classNames":
            "d-flex flex-column justify-content-center mt-5 h-100",
          "ui:options": {
            disableButton: (formData) => {
              let requiredFields = jsonSchema.required || [];
              const allFilled = requiredFields.every((field) => {
                const value = formData?.[field];
                return value !== undefined && value !== null && value !== "";
              });

              return this.form_status?.includes("init") && !allFilled;
            },
            onClick: (value) => {
              this.calculateRisk(value);
            },
          },
        },

        transaction_justification: {
          "ui:classNames": "h-auto",
        },
        approval_status: {
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval")
          ),

          "ui:widget":
            this.form_status?.includes("review") &&
            (this.formData?.risk_level?.includes("High") ||
              this.formData?.is_high_risk_account === "Yes")
              ? "hidden"
              : this.form_status?.includes("review") ||
                this.form_status?.includes("approval")
              ? "SelectWidget"
              : "hidden",
        },
        acknowledge: {
          "ui:classNames": "mt-5",
          "ui:label": false,
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval")
          ),

          "ui:widget": this.form_status?.includes("approval")
            ? "CustomCheckBoxWidget"
            : "hidden",
        },
        approval_remarks: {
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval")
          ),

          "ui:widget":
            this.form_status?.includes("review") &&
            (this.formData?.risk_level?.includes("High") ||
              this.formData?.is_high_risk_account === "Yes")
              ? "hidden"
              : this.form_status?.includes("review") ||
                this.form_status?.includes("approval")
              ? "textarea"
              : "hidden",
          "ui:options": {
            rows: 5,
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
