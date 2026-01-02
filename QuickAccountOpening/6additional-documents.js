(function () {
  if (window.UISchemaFactory) {
    delete window.UISchemaFactory;
  }
  //backup
  class UISchemaFactory {
    constructor(masterDataUrl, options = {}) {
      this.apiClient = options.apiClient;
      this.optionsData = options.optionsData;
      this.setOptionsData = options.setOptionsData;
      this.setFormData = options.setFormData;
      this.setJsonSchema = options.setJsonSchema;
      this.axios = options.axios;
      this.setProgressBar = options.setProgressBar;
      this.setUiSchema = options.setUiSchema;
      this.mainRouteURL = options.mainRouteURL;
      this.masterDataUrl = masterDataUrl;
      this.case_id = options.case_id;
      this.setRenderFormKey = options.setRenderFormKey;
      this.isMasterDataLoaded = false; // Flag to track if master data is loaded
    }

    async updateSchemaWithEnums(
      fieldKey,

      optionsData,

      setJsonSchema,

      cascadeId = null
    ) {
      const fieldMapping = {
        mode_of_operation: "mode_of_operations",
      };

      const dataKey = fieldMapping[fieldKey] || fieldKey;

      let fieldOptions = optionsData[dataKey] || [];

      if (cascadeId !== null) {
        const validCascadeIds = Array.isArray(cascadeId)
          ? cascadeId
          : [cascadeId];

        // Filter gender options where at least one cascade_id matches salutation ID

        fieldOptions = fieldOptions.filter((option) => {
          if (!option.cascade_id) return false;

          const cascadeArray = Array.isArray(option.cascade_id)
            ? option.cascade_id
            : [option.cascade_id];

          return cascadeArray.some((id) => validCascadeIds.includes(id));
        });
      }

      const enumValues = Array.from(
        new Set(
          fieldOptions.map((item) =>
            String(item?.fg_code || item?.cbs_code || item?.id)
          )
        )
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

                ...fieldOptions[index],
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

    updateSchemaWithAdditionalDocs(formData) {
      const documents = [
        {
          id: "9a4a28ca-203b-11f0-a4cd-005056b0e504",
          title: "PASSPORT SIZE PHOTO",
          cbs_code: "IDCRD",
          is_required: true,
          max_size: 10,
          multipleUpload: true,
        },
        {
          id: "744f5d2b-203b-11f0-a4cd-005056b0e504",
          title: "Signature",
          cbs_code: "SPCMN",
          is_required: true,
          sampleurl: "/media/samples/signature.png",
          max_size: 10,
          multipleUpload: true,
        },
        // Add more documents as needed
      ];

      this.setJsonSchema((prevSchema) => {
        if (!prevSchema || typeof prevSchema !== "object") {
          console.warn("Invalid schema provided to setJsonSchema.");
          return prevSchema;
        }

        const updatedSchema = { ...prevSchema };

        if (!updatedSchema.properties) updatedSchema.properties = {};
        if (!Array.isArray(updatedSchema.required)) updatedSchema.required = [];

        documents.forEach((doc) => {
          updatedSchema.properties[doc.cbs_code] = {
            type: "string",
            name: doc.cbs_code,
            title: doc.title,
            docId: doc.id,
            size: doc.max_size,
            default: "",
            ...(doc.multipleUpload && {
              description: "You can add multiple files here",
            }),
          };

          if (
            doc.is_required &&
            !updatedSchema.required.includes(doc.cbs_code)
          ) {
            updatedSchema.required.push(doc.cbs_code);
          }
        });

        // Update UI Schema
        this.setUiSchema((prevUiSchema) => {
          const newUi = { ...prevUiSchema };
          documents?.forEach((doc) => {
            newUi[doc.cbs_code] = {
              "ui:widget": "CropAndUploadWidget",
              ...(doc.multipleUpload && {
                "ui:options": {
                  multiple: true,
                },
              }),
            };
          });

          return newUi;
        });

        return updatedSchema;
      });
    }

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
    }

    async initializeSchema(setJsonSchema, formData) {
      const fieldsToUpdate = ["mode_of_operation"];
      for (const fieldKey of fieldsToUpdate) {
        this.updateSchemaWithEnums(fieldKey, this.optionsData, setJsonSchema);
      }

      this.updateSchemaWithAdditionalDocs(formData);
    }

    createUISchema(options) {
      const {
        setJsonSchema,
        formData,
        setFormData,
        jsonSchema,
        ObjectFieldTemplate,
      } = options;

      // Initialize schema dynamically based on API data
      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:order": [
          "document_preview",
          "IDCRD",
          "SPCMN",
          "mode_of_operation",
          "remarks",
        ],
        document_preview: {
          "ui:label": false,
          "ui:widget": "DocumentsPreview",
          "ui:options": {
            idToRender: ["b9e7481e-1a93-11f0-88e5-005056b0e504"],
            filterByCbsCode: ["AOF", "IDCRD", "SPCMN"],
          },
        },
        mode_of_operation: {},
        remarks: {
          "ui:widget": "textarea",
          "ui:options": {
            rows: 5,
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
