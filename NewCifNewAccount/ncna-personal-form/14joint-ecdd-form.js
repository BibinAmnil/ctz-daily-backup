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
      this.setRenderFormKey = options.setRenderFormKey;
    }

    convertDate(
      selectedDate,
      setFormData,
      fromAdToBs,
      fieldKey,
      arrayName = null,
      index = null
    ) {
      const fieldMapping = {
        visa_expiry_date_ad: ["visa_expiry_date_ad", "visa_expiry_date_bs"],
        visa_expiry_date_bs: ["visa_expiry_date_ad", "visa_expiry_date_bs"],
        passport_expiry_date_ad: [
          "passport_expiry_date_ad",
          "passport_expiry_date_bs",
        ],
        passport_expiry_date_bs: [
          "passport_expiry_date_ad",
          "passport_expiry_date_bs",
        ],
        pep_retirement_date_ad: [
          "pep_retirement_date_ad",
          "pep_retirement_date_bs",
        ],
        pep_retirement_date_bs: [
          "pep_retirement_date_ad",
          "pep_retirement_date_bs",
        ],
        employee_address_verification_date_ad: [
          "employee_address_verification_date_ad",
          "employee_address_verification_date_bs",
        ],
        employee_address_verification_date_bs: [
          "employee_address_verification_date_ad",
          "employee_address_verification_date_bs",
        ],
      };

      const [adField, bsField] = fieldMapping[fieldKey] || [];
      if (!adField || !bsField) return;

      const convertedDate = fromAdToBs
        ? this.adToBs(selectedDate)
        : this.bsToAd(selectedDate);

      setFormData((prevFormData) => {
        const updatedFormData = { ...prevFormData };

        // Handle array fields (if arrayName and index are provided)
        if (arrayName && index !== null) {
          const array = updatedFormData[arrayName];
          if (Array.isArray(array) && array[index]) {
            updatedFormData[arrayName] = array.map((item, i) =>
              i === index
                ? {
                    ...item,
                    [adField]: fromAdToBs ? selectedDate : convertedDate,
                    [bsField]: fromAdToBs ? convertedDate : selectedDate,
                  }
                : item
            );
          }
        }
        // Handle normal fields (if arrayName and index are not provided)
        else {
          updatedFormData[adField] = fromAdToBs ? selectedDate : convertedDate;
          updatedFormData[bsField] = fromAdToBs ? convertedDate : selectedDate;
        }

        return updatedFormData;
      });
      this.setRenderFormKey((prevData) => {
        return prevData + 1;
      });
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
        id_type_id: "document_types",
        occupation_type: "occupations",
        source_of_income: "income_sources",
        nationality: "nationalities",
        earner_relationship: "relationships",
        earner_remittance_country: "countries",
        high_risk_category: "high_risk_categories",
        high_risk_sub_category: "high_risk_sub_categories",
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

    async initializeSchema(setJsonSchema, formData) {
      const fieldsToUpdate = [
        "id_type_id",
        "occupation_type",
        "source_of_income",
        "nationality",
        "earner_relationship",
        "earner_remittance_country",
        "high_risk_category",
        "high_risk_sub_category",
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
      if (this.formData?.case_status === "final-review") {
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
      } else if (this.formData?.case_status === "Completed") {
        this.setJsonSchema((prevSchema) => ({
          ...prevSchema,
          submissionHidden: true,
        }));
      }
    }

    createUISchema(options) {
      const {
        setJsonSchema,
        formData,
        setFormData,
        ObjectFieldTemplate,
        widgets,
      } = options;

      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": [
          "pep",
          "pep_category",
          "pep_retirement_date_ad",
          "pep_retirement_date_bs",
          "pep_classification",
          "pep_name_involvement",
          "pep_family_account_with_bank",
          "pep_related_member_account_number",
          "pep_related_member_account_name",
          "pep_related_member_relationship",
          "pep_related_member_risk_category",
          "pep_related_member_recommended_to_change",
          "occupation_type",
          "occupation_profession_business_details",
          "name_of_organization",
          "organization_full_address",
          "contact_number",
          "nature_of_business",
          "designation",
          "estimated_annual_income",
          "source_of_income",
          "yearly_income",
          "earner_name",
          "earner_relationship",
          "earner_remittance_country",
          "earner_nature_of_job",
          "earner_status",
          "address_verification",
          "employee_id",
          "employee_name",
          "employee_address_verification_date_ad",
          "employee_address_verification_date_bs",
          "is_identified_as_beneficiary_owner",
          "beneficiary_owner_has_kyc",
          "beneficiary_owner_has_id",
          "beneficiary_owner_has_screening",
          "screening_result_matched_adverse_media",
          "adverse_category",
          "adverse_status",
          "nationality",
          "purpose_of_account_open",
          "purpose_of_visit",
          "visa_expiry_date_ad",
          "visa_expiry_date_bs",
          "passport_expiry_date_ad",
          "passport_expiry_date_bs",
          "employer_confirmation",
          "mandatee_not_family_member",
          "mandatee_intent_for_account_opening",
          "high_risk_category",
          "high_risk_sub_category",
          "risk_score",
          "approval_status",
          "revert_to",
          "approval_remarks",
        ],
        pep_retirement_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Date of Retirement (A.D)",
          "ui:options": {
            name: "pep_retirement_date_ad",
            enforceAgeRestriction: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "pep_retirement_date_ad"
              );
            },
          },
        },
        occupation_profession_business_details: {
          "ui:options": {
            addable: false,
            orderable: false,
            removable: false,
          },
        },
        pep_retirement_date_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:options": {
            enforceAgeRestriction: true,
            name: "pep_retirement_date_bs",
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "pep_retirement_date_bs"
              );
            },
          },
        },
        visa_expiry_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Date (A.D)",
          "ui:options": {
            name: "visa_expiry_date_ad",
            minDate: 0,
            enableFutureDates: true,
            enforceAgeRestriction: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "visa_expiry_date_ad"
              );
            },
          },
        },
        visa_expiry_date_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:options": {
            enforceAgeRestriction: true,
            name: "visa_expiry_date_bs",
            minDate: 0,
            enableFutureDates: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "visa_expiry_date_bs"
              );
            },
          },
        },
        passport_expiry_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Date (A.D)",
          "ui:options": {
            name: "passport_expiry_date_ad",
            minDate: 0,
            enforceAgeRestriction: true,
            enableFutureDates: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "passport_expiry_date_ad"
              );
            },
          },
        },
        passport_expiry_date_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:options": {
            enforceAgeRestriction: true,
            name: "passport_expiry_date_bs",
            minDate: 0,
            enableFutureDates: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "passport_expiry_date_bs"
              );
            },
          },
        },
        employee_address_verification_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Date (A.D)",
          "ui:options": {
            name: "employee_address_verification_date_ad",
            enforceAgeRestriction: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "employee_address_verification_date_ad"
              );
            },
          },
        },
        employee_address_verification_date_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:options": {
            enforceAgeRestriction: true,
            name: "employee_address_verification_date_bs",
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "employee_address_verification_date_bs"
              );
            },
          },
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
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
