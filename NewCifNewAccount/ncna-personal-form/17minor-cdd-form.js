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
      this.setUiSchema = options.setUiSchema;
      this.adToBs = options.adToBs;
      this.bsToAd = options.bsToAd;
      this.masterDataUrl = masterDataUrl;
      this.isMasterDataLoaded = false;
      this.setNextStep = options.setNextStep;
      this.schemaConditions = options.schemaConditions;
      this.hasUpdated = options.hasUpdated;
      this.setDivide = options.setDivide;
      this.setRenderFormKey = options.setRenderFormKey;
      this.case_id = options.case_id;
      this.toast = options.toast;
    }

    addLoader = (field, loading) => {
      this.setUiSchema((prevUiSchema) => ({
        ...prevUiSchema,
        [field]: {
          ...prevUiSchema[field],
          "ui:options": {
            ...prevUiSchema[field]["ui:options"],
            show_loader: loading,
          },
        },
      }));
    };

    // FUNCTION TO FILTER OPTIONS AS PER CASCADE
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
        occupation_type: "occupations",
        source_of_income: "income_sources",
        related_party_relation_with_account_holder: "relationships",
        business_type: "business_type",
        existing_risk_rating: "risk_categories",
        account_info: "account_category",
        designation: "corporate_relation",
        designation: "corporate_relation",
        constitution_code_id: "constitution_types",
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

    async calculateRisk(value) {
      try {
        this.addLoader("calculate_risk", true);
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...this.formData,
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
            is_high_risk_account: resp?.is_high_risk_account ? "Yes" : "No",
          }));
          this.setJsonSchema((prevJsonSchema) => {
            return {
              ...prevJsonSchema,
              isDisabled: false,
            };
          });
        }

        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        this.toast.error(error?.response?.data?.message);
        return {};
      } finally {
        this.addLoader("calculate_risk", false);
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

        console.log(schema.properties[key], "json schema");

        // Check if the field is an array and has items
        if (field.type === "array" && field.items) {
          field.minItems = formData[key]?.length > 0 ? formData[key].length : 1;

          // If array contains objects, check for nested arrays
          if (field.items.type === "object" && field.items.properties) {
            formData[key]?.forEach((item) => {
              console.log(
                field.items.properties.related_party_detail,
                "field.items.properties.related_party_detail"
              );

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
      if (!this.form_status?.includes("case-init")) {
        this.setDivide(true);
      }

      const fieldsToUpdate = [
        "permanent_country",
        "permanent_province",
        "nationality",
        "permanent_district",
        "family_member_relation",
        "occupation_type",
        "source_of_income",
        "related_party_relation_with_account_holder",
        "business_type",
        "existing_risk_rating",
        "account_info",
        "designation",
        "designation",
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
      this.formData = formData;
      if (
        (this.formData?.current_step.includes("review") ||
          this.formData?.current_step === "final-review") &&
        this.formData?.risk_level.includes("High")
      ) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: true,
        }));
        this.setNextStep("minor-ncna-ecdd-form");
      } else if (
        this.formData?.current_step !== "final-review" &&
        this.formData?.current_step !== "case-init"
      ) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: false,
        }));
      } else if (
        this.formData?.current_step === "Completed" &&
        !this.formData?.risk_level?.includes("High")
      ) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: false,
          submissionHidden: true,
        }));
      } else if (
        this.formData?.current_step === "case-init" &&
        !this.formData?.risk_level?.includes("High")
      ) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: true,
        }));
        this.setNextStep("minor-ncna-documents");
      } else {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: true,
        }));
        this.setNextStep("minor-ncna-documents");
      }

      if (
        this.form_status?.includes("review") ||
        (this.form_status?.includes("approval") && !this.hasUpdated.current)
      ) {
        this.hasUpdated.current = true;
        this.setJsonSchema((prevSchema) => {
          if (!prevSchema) return prevSchema;

          return {
            ...prevSchema,
            isDisabled: false,
            hasStep: this.formData?.risk_level.includes("High") ? true : false,
            required: this.formData?.risk_level.includes("High")
              ? []
              : [
                  ...new Set([
                    ...(prevSchema.required || []),
                    "approval_status",
                    "approval_remarks",
                  ]),
                ],
          };
        });
      }
    }

    createUISchema(options) {
      const {
        setJsonSchema,
        formData,
        setFormData,
        ObjectFieldTemplate,
        ArrayFieldTemplate,
        widgets,
        jsonSchema,
      } = options;

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

          "occupation_type",

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

          "approval_status",
          "revert_to",
          "approval_remarks",

          "account_info",
        ],
        account_info: {
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

        occupation_type: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: () => {
              return this.filterOptions("occupations");
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
        transaction_justification: {
          "ui:classNames": "h-auto",
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

        approval_status: {
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval")
          ),

          "ui:widget":
            this.form_status?.includes("review") &&
            this.formData?.risk_level.includes("High")
              ? "hidden"
              : this.form_status?.includes("review") ||
                this.form_status?.includes("approval")
              ? "SelectWidget"
              : "hidden",
        },
        revert_to: {
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval")
          ),

          "ui:widget":
            this.formData?.current_step === "final-review" &&
            this.formData?.risk_level.includes("High")
              ? "hidden"
              : this.form_status?.includes("review") ||
                this.form_status?.includes("approval")
              ? "CascadeDropdown"
              : "hidden",

          "ui:options": {
            getOptions: (formData, index) => {
              const option = (
                this.formData?.revert_list || formData?.revert_list
              )?.map((item) => {
                return {
                  label: item,
                  value: item,
                };
              });

              return option || [];
            },
          },
        },
        approval_remarks: {
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval")
          ),

          "ui:widget":
            this.form_status?.includes("review") &&
            this.formData?.risk_level.includes("High")
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
