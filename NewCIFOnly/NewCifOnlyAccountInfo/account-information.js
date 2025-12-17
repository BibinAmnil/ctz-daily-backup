(function () {
  if (window.UISchemaFactory) {
    delete window.UISchemaFactory;
  }

  class UISchemaFactory {
    constructor(masterDataUrl, options = {}) {
      this.axios = options.axios;

      this.toast = options.toast;

      this.setRenderFormKey = options.setRenderFormKey;

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

      this.setStepModule = options.setStepModule;

      this.setExternalUrl = options.setExternalUrl;

      this.schemaConditions = options.schemaConditions;
    }

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;

      const next_step = schemaConditions?.accountInfo?.find(
        (item) => item?.account_type === this.formData?.account_info
      )?.step_slug;

      if (next_step) {
        this.setNextStep(next_step);
      }
    }

    async updateSchemaWithEnums(
      fieldKey,

      optionsData,

      setJsonSchema,

      cascadeId = null
    ) {
      const fieldMapping = {
        account_info: "account_category",
      };

      const dataKey = fieldMapping[fieldKey] || fieldKey;

      let fieldOptions = optionsData[dataKey] || [];

      if (cascadeId !== null) {
        const validCascadeIds = Array.isArray(cascadeId)
          ? cascadeId
          : [cascadeId];

        fieldOptions = fieldOptions.filter((option) => {
          if (!option.cascade_id) return false;

          const cascadeArray = Array.isArray(option.cascade_id)
            ? option.cascade_id
            : [option.cascade_id];

          return cascadeArray.some((id) => validCascadeIds.includes(id));
        });
      }

      const enumValues = Array.from(
        new Set(fieldOptions.map((item) => String(item.fg_code || item.id)))
      );

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

                if (dependency.else) {
                  if (dependency.if) {
                    if (dependency.then) updateProperties(dependency.then);

                    if (dependency.else) updateProperties(dependency.else);
                  } else {
                    updateProperties(dependency.else);
                  }
                }
              }
            }
          }
        };

        const updatedSchema = { ...prevSchema };

        updateProperties(updatedSchema);

        return updatedSchema;
      });
    }

    async familyNameChange(fieldName, value, arrayPath, index) {
      setTimeout(() => {
        this.setFormData((prevFormData) => {
          const updatedFamilyDetails = [...prevFormData[arrayPath]];

          updatedFamilyDetails[index] = {
            ...updatedFamilyDetails[index],

            [fieldName]: value ? "N/A" : "",
          };

          return {
            ...prevFormData,

            [arrayPath]: updatedFamilyDetails,
          };
        });
      }, 700);
    }

    async initializeSchema(setJsonSchema, formData) {
      const next_step = this.schemaConditions?.accountInfo?.find(
        (item) => item?.account_type === this.formData?.account_info
      )?.step_slug;

      next_step && this.setNextStep(next_step);

      const fieldsToUpdate = ["account_info"];

      for (const fieldKey of fieldsToUpdate) {
        this.updateSchemaWithEnums(fieldKey, this.optionsData, setJsonSchema);
      }

      this.updateFieldsBasedOnConditions(formData, setJsonSchema);
    }

    updateFieldsBasedOnConditions(formData, setJsonSchema) {
      if (this.formData?.account_info === "CORPORATE") {
        this.setExternalUrl(
          "/new-cif-only/opening-requests/corporate-cif-form"
        );
      } else {
        this.setExternalUrl(
          "/new-cif-only/opening-requests/individual-cif-form"
        );
      }
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

    createUISchema(options) {
      const {
        setJsonSchema,

        formData,

        setFormData,

        ObjectFieldTemplate,

        ArrayFieldTemplate,

        widgets,
      } = options;

      const provinceOnChange = async (value, districtName) => {
        await this.updateSchemaWithEnums(
          districtName,

          this.optionsData,

          setJsonSchema,

          value
        );
      };

      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,

        "ui:order": ["account_info"],

        account_info: {
          "ui:widget": "CustomRadioWidget",

          "ui:label": false,

          "ui:options": {
            getOptions: (formData, index) => {
              return this.optionsData["account_category"]
                ?.filter((data) =>
                  ["Corporate", "Individual", "Minor"].includes(data?.title)
                )
                ?.map((item) => ({
                  label: item.title,
                  value: item.fg_code || item.id,
                }));
            },
            onChange: (value) => {
              const changedValue =
                value === "CORPORATE"
                  ? "/new-cif-only/opening-requests/corporate-cif-form"
                  : value === "MINOR"
                  ? "/new-cif-only/opening-requests/minor-cif-form"
                  : "/new-cif-only/opening-requests/individual-cif-form";

              this.setStepModule(
                value === "CORPORATE"
                  ? "new-cif-new-account-coorperate"
                  : "new-cif-new-account-personal"
              );

              this.setExternalUrl(changedValue);
            },
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
