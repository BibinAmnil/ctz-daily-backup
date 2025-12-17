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

    filterOptionsByCascadeId(options, cascadeId) {
      const filteredOptions = options.filter(
        (option) => option.cascade_id == cascadeId
      );

      return filteredOptions;
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
        pep_retirement_date_ad: [
          "pep_retirement_date_ad",
          "pep_retirement_date_bs",
        ],
        pep_retirement_date_bs: [
          "pep_retirement_date_ad",
          "pep_retirement_date_bs",
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
              field.enumNames = [...enumNames];
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
        ObjectFieldTemplate,
        widgets,
        setFormData,
      } = options;

      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,

        "ui:order": [
          "entity_expired",
          "reason_to_proceed",
          "major_source_of_income",
          "entity_require_permits",
          "is_license_valid",
          "specify_reason_for_valid_liscense",
          "is_entity_has_complex_shareholding_pattern",

          "layers_identified",

          "adverse_media",
          "adverse_category",
          "status_adverse_match",

          "pep",
          "pep_category",
          "pep_retirement_date_ad",
          "pep_retirement_date_bs",
          "related_party",
          "pep_classification",
          "pep_name_involvement",

          "pep_related_member_account_number",
          "pep_related_member_account_name",
          "cbs_risk_category",
          "pep_related_member_recommended_to_change",

          "business_type",
          "area_of_business",
          "is_latest_audit_report_submitted",
          "is_tax_clearance_obtained",
          "reason_for_not_receiving_audit",
          "transaction_volume_match_audit_and_tax",
          "other_income_source",

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
          "adverse_status",

          "single_entity_not_family_or_owner",
          "purpose_to_operate_single_person",
          "approval_status",
          "approval_remarks",
        ],

        entity_expired: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        business_type: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        area_of_business: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        is_latest_audit_report_submitted: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        other_income_source: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },

        address_verification: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },

        screening_result_matched_adverse_media: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },

        single_entity_not_family_or_owner: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        transaction_volume_match_audit_and_tax: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        is_identified_as_beneficiary_owner: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        purpose_to_operate_single_person: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        is_tax_clearance_obtained: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },
        reason_for_not_receiving_audit: {
          "ui:disabled":
            this.formData?.case_status === "Completed" ? true : false,
        },

        pep_retirement_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:options": {
            name: "pep_retirement_date_ad",
            enforceAgeRestriction: false,
            minDate: 0,
            enableFutureDates: true,
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
        pep_retirement_date_bs: {
          "ui:widget": "NepaliDatePickerR",
          "ui:options": {
            name: "pep_retirement_date_bs",
            enforceAgeRestriction: false,
            minDate: 0,
            enableFutureDates: true,
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

        approval_status: {
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval")
          ),

          "ui:widget":
            this.form_status?.includes("review") ||
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
            this.form_status?.includes("review") ||
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
