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
      this.toast = options.toast;
      this.case_id = options.case_id;
      this.schemaConditions = options.schemaConditions;
      this.setRenderFormKey = options.setRenderFormKey;
      this.toast = options?.toast;
    }

    filterOptionsByCascadeId(options, cascadeId) {
      const filteredOptions = options.filter(
        (option) => option.cascade_id == cascadeId
      );

      return filteredOptions;
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

    dropdownReset = async (
      value,
      name,
      dropdownClearObject,
      updateOtherEnum
    ) => {
      (await updateOtherEnum) &&
        this.updateSchemaWithEnums(
          name,
          this.optionsData,
          setJsonSchema,
          value
        );
      setTimeout(() => {
        this.setFormData((prevFormData) => {
          return {
            ...prevFormData,
            ...dropdownClearObject,
          };
        });
      }, 200);
    };

    async updateSchemaWithEnums(
      fieldKey,
      optionsData,
      setJsonSchema,
      cascadeId = null
    ) {
      const fieldMapping = {
        nationality: "nationalities",
        registration_country: "countries",
        registration_province: "provinces",
        registration_district: "districts",
        family_member_relation: "relationships",
        occupation_type: "occupation_types",
        source_of_income: "income_sources",
        relation_with_account_holder: "relationships",
        business_type_id: "business_type",
      };
      const dataKey = fieldMapping[fieldKey] || fieldKey;
      let fieldOptions = optionsData[dataKey] || [];

      if (cascadeId !== null) {
        fieldOptions = this.filterOptionsByCascadeId(fieldOptions, cascadeId);
      }

      const enumValues = [
        ...new Set(
          fieldOptions.map((option) =>
            String(option?.fg_code || option?.cbs_code || option?.id)
          )
        ),
      ];

      // fieldOptions.map((option) => String(option?.fg_code || option?.cbs_code || option?.id));
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
      this.setUiSchema((prevUiSchema) => ({
        ...prevUiSchema,
        calculate_risk: {
          ...prevUiSchema.calculate_risk,
          "ui:disabled": false,
          "ui:options": {
            ...prevUiSchema.calculate_risk["ui:options"],
            show_loader: true,
          },
        },
      }));
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...this.formData,
            category: "entity",
            id: this.case_id,
            get_average_corporate: true,
          }
        );

        if (response) {
          this.toast.success("Risk calculation successful");
          const resp = response?.data;
          this.setFormData((prevData) => ({
            ...prevData,
            risk_level: resp?.risk_level?.toString(),
            risk_score: resp?.risk_score?.toString(),
            is_high_risk_acc: resp?.is_high_risk_acc,
            is_high_risk_account: resp?.is_high_risk_acc ? "Yes" : "No",
          }));
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
            "ui:disabled": false,
            "ui:options": {
              ...prevUiSchema.calculate_risk["ui:options"],
              show_loader: false,
            },
          },
        }));
      }
    }

    async initializeSchema(setJsonSchema, formData) {
      this.formData = formData;
      this.setFormData((prevData) => ({
        ...prevData,
        is_high_risk_account: formData?.is_high_risk_acc ? "Yes" : "No",
      }));

      const fieldsToUpdate = [
        "nationality",
        "business_type_id",
        "registration_country",
        "registration_district",
        "family_member_relation",
        "occupation_type",
        "source_of_income",
        "relation_with_account_holder",
        "registration_province",
        "registration_district",
      ];

      for (const fieldKey of fieldsToUpdate) {
        this.updateSchemaWithEnums(fieldKey, this.optionsData, setJsonSchema);
      }

      // Update fields based on conditions
      this.updateFieldsBasedOnConditions(formData, setJsonSchema);
    }

    updateFieldsBasedOnConditions(formData, setJsonSchema) {
      setJsonSchema((prevSchema) => {
        if (!prevSchema || !prevSchema.properties) {
          return prevSchema;
        }

        // Get the original schema's required fields
        const originalRequired = new Set(
          prevSchema.originalRequired || prevSchema.required || []
        );

        const updatedProperties = Object.keys(prevSchema.properties).reduce(
          (acc, fieldKey) => {
            const field = prevSchema.properties[fieldKey];
            acc[fieldKey] = field;
            return acc;
          },
          {}
        );
        return {
          ...prevSchema,
          originalRequired: Array.from(originalRequired), // Preserve original required fields
          properties: updatedProperties,
        };
      });
    }

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
      if (
        (this.formData?.current_step === "final-review" &&
          this.formData?.risk_level.includes("High")) ||
        (this.formData?.current_step === "Completed" &&
          this.formData?.risk_level.includes("High"))
      ) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: true,
        }));
        this.setNextStep("corporate-cif-ecdd");
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
          hasStep: false,
        }));
      }
      this.setFormData((prevData) => ({
        ...prevData,
        is_high_risk_account: formData?.is_high_risk_acc ? "Yes" : "No",
      }));

      if (
        this.form_status?.includes("review") ||
        this.form_status?.includes("approval")
      ) {
        this.setJsonSchema((prevSchema) => {
          if (!prevSchema) return prevSchema;

          return {
            ...prevSchema,
            isDisabled: false,
            hasStep:
              this.formData?.current_step === "final-review" &&
              this.formData?.risk_level.includes("High")
                ? true
                : false,
            required:
              this.formData?.current_step === "final-review" &&
              this.formData?.risk_level.includes("High")
                ? []
                : [
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
      } = options;

      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": [
          "pep",
          "pep_category",
          "adverse_media",
          "adverse_category",
          "registration_country",
          "registration_province",
          "registration_district",
          "registration_town",
          "registration_street",
          "registration_postal_code",
          "related_party",
          "first_name",
          "middle_name",
          "last_name",
          "is_account_signatory_same",
          "is_account_signatory_family_member",
          "is_account_signatory_has_sole_authority",
          "has_related_person_kyc_document_completed",
          "entiy_have_complex_business_ownership",
          "business_type_id",
          "existing_risk_rating",
          "loan_status",
          "is_blacklisted",
          "customer_introduce_by",
          "introducer_account_number",
          "employee_id",
          "met_in_person",
          "income_year",
          "declared_anticipated_annual_transaction",
          "expected_anticipated_annual_transaction",
          "number_of_transaction",
          "yearly_income",
          "transaction_justification",
          "transaction_fund_details",
          "screening_ref_number",
          "external_cdd_id",
          "risk_level",
          "calculate_risk",
          "risk_score",
          "is_high_risk_account",
          "acknowledge",
          "approval_status",
          "approval_remarks",
          "is_sanction",
          "is_cib_list",
          "is_block_list",
          "is_high_risk_acc",
        ],
        is_high_risk_acc: {
          "ui:widget": "hidden",
        },
        occupation_type: {
          "ui:options": {
            onChange: (value) => {
              this.handleOccupation(value);
            },
          },
        },
        registration_province: {
          "ui:options": {
            onChange: (value) =>
              this.dropdownReset(
                value,
                "permanent_district",
                {
                  registration_province: value,
                  registration_district: null,
                },
                false
              ),
            // onChange: (value) => provinceOnChange(value, "permanent_district"),
          },
        },
        registration_district: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "districts",
                formData?.registration_province
              );
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
            onClick: (value) => {
              this.calculateRisk(value);
            },
          },
        },
        related_party: {
          "ui:ArrayFieldTemplate": ArrayFieldTemplate,
          "ui:options": {
            addable: false,
            orderable: false,
            removable: false,
          },
          items: {
            "ui:order": [
              "related_party_designation",
              "first_name",
              "middle_name",
              "last_name",
              "name",
              "is_account_signatory_same",
              "is_account_signatory_family_member",
              "is_account_signatory_has_sole_authority",
              "has_related_person_kyc_document_completed",
            ],
            related_party_designation: {
              "ui:widget": "hidden",
              "ui:label": false,
              "ui:options": {
                orderable: false,
                addable: false,
                removable: false,
              },
              items: {
                "ui:ObjectFieldTemplate": ObjectFieldTemplate,
                "ui:order": [
                  "designation",
                  "customer_designation",
                  "beneficial_shares",
                  "shares",
                  "organization_name",
                ],
                designation: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      // Get filtered options from corporate_relation
                      const filterOption = this.filterOptions(
                        "corporate_relation_types"
                      );
                      return filterOption || [];
                    },
                  },
                },
                customer_designation: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    setDisabled: (formData, index) => {
                      const designation =
                        this.formData?.related_party?.[index[0]]
                          ?.related_party_designation?.[index[1]]?.designation;
                      return !designation;
                    },
                    getOptions: (formData, index) => {
                      const filterOption = this.filterOptions(
                        "corporate_relation",
                        formData?.related_party?.[index[0]]
                          ?.related_party_designation[index[1]]?.designation ||
                          this.formData?.related_party?.[index[0]]
                            ?.related_party_designation[index[1]]?.designation
                      );

                      // Otherwise return all options
                      return filterOption;
                    },
                  },
                },
                shares: {
                  "ui:options": {
                    type: "number",
                    maxLength: 3,
                  },
                },
                organization_name: {},
              },
            },
          },
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

        approval_status: {
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
              ? "SelectWidget"
              : "hidden",
        },

        approval_remarks: {
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
              ? "textarea"
              : "hidden",
          "ui:options": {
            rows: 5,
          },
        },
        declared_anticipated_annual_transaction: {
          "ui:options": {
            addonBefore: "Customer",
            amount: true,
          },
        },
        expected_anticipated_annual_transaction: {
          "ui:options": {
            addonBefore: "Branch",
            amount: true,
          },
        },
        yearly_income: {
          "ui:options": {
            amount: true,
          },
        },
        registration_country: {
          "ui:disabled": true,
        },

        registration_province: {
          "ui:disabled": true,
        },

        registration_district: {
          "ui:disabled": true,
        },

        registration_town: {
          "ui:disabled": true,
        },
        registration_street: {
          "ui:disabled": true,
        },
        registration_postal_code: {
          "ui:disabled": true,
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
        is_high_risk_account: {
          "ui:widget": "hidden",
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
