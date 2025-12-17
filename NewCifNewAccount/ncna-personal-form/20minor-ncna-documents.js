(function () {
  if (window.UISchemaFactory) {
    delete window.UISchemaFactory;
  }

  class UISchemaFactory {
    constructor(masterDataUrl, options = {}) {
      this.apiClient = options.apiClient;
      this.optionsData = options.optionsData;
      this.setOptionsData = options.setOptionsData;
      this.setFormData = options.setFormData;
      this.setJsonSchema = options.setJsonSchema;
      this.axios = options.axios;
      this.mainRouteURL = options.mainRouteURL;
      this.setUiSchema = options.setUiSchema;
      this.masterDataUrl = masterDataUrl;
      this.setNextStep = options.setNextStep;
      this.form_status = options.form_status;
      this.setRenderFormKey = options.setRenderFormKey;
      this.isMasterDataLoaded = false; // Flag to track if master data is loaded
      this.case_id = options.case_id;
      this.toast = options.toast;
    }

    updateJsonWithAdditionalData(responseData) {
      if (
        !responseData ||
        typeof responseData !== "object" ||
        !responseData.data
      ) {
        console.error("Invalid response data format:", responseData);
        return;
      }

      const data = responseData.data;

      this.setJsonSchema(() => {
        const updatedSchema = {
          form_title: "documents",
          type: "object",
          width: "full",
          hasStep: true,
          properties: {
            document: {
              type: "object",
              width: "full",
              properties: {
                details: {
                  type: "object",
                  width: "full",
                  properties: {},
                  required: [],
                },
              },
            },
          },
        };

        const uiSchema = {
          document: {
            details: {},
          },
        };

        const formData = {
          document: {
            details: {},
          },
        };

        const root = updatedSchema.properties.document.properties.details;

        Object.entries(data).forEach(([key, value]) => {
          const isDocuments = key.toLowerCase() === "documents";

          if (isDocuments && Array.isArray(value)) {
            const requireDoc = [];

            value.forEach((doc, index) => {
              const fieldKey = doc?.code || `doc_${index}`;
              if (doc?.is_required) {
                requireDoc.push(fieldKey);
              }
              root.properties[fieldKey] = {
                type: "string",
                // type: doc?.allow_multiple !== 0 ? "array" : "string",
                // format: "data-url",
                title: doc?.title || `Document ${index + 1}`,
                docId: doc?.id || null,

                // ...(doc?.allow_multiple !== 0 && {
                //   items: {
                //     type: "string",
                //     format: "data-url",
                //     width: 6,
                //   },
                // }),
                allow_multiple: doc?.allow_multiple === 0 ? false : true,
              };

              uiSchema.document.details[fieldKey] = {
                "ui:widget": "file",
              };

              formData.document.details[fieldKey] = ""; // default empty value
            });

            root.required = requireDoc;
          } else if (Array.isArray(value)) {
            // Handle named arrays (e.g. joint_details, co_applicants, etc.)
            const groupKey = key;
            const groupTitle = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());

            const groupSchema = {
              type: "object",
              width: "full",
              group: key,
              title: groupTitle,
              properties: {},
            };

            const groupUiSchema = {};
            const groupFormData = {};

            value.forEach((item, idx) => {
              const itemKey =
                item?.name?.replace(/\s+/g, "-").toLowerCase() || `item_${idx}`;

              const itemSchema = {
                type: "object",
                width: "full",
                properties: {},
                required: [],
              };

              const itemUiSchema = {};
              const itemFormData = {};

              if (item.name) {
                itemSchema.properties.name = {
                  type: "string",
                  title: "Name",
                  default: item.name,
                  readOnly: true,
                };
                itemFormData.name = item.name;
              }

              if (Array.isArray(item.documents)) {
                const docFields = {};
                const docUi = {};
                const docRequired = [];
                const docFormData = {};

                item.documents.forEach((doc, docIndex) => {
                  const fieldKey = doc?.code || `doc_${docIndex}`;
                  if (doc?.is_required) {
                    docRequired.push(fieldKey);
                  }

                  docFields[fieldKey] = {
                    type: "string",
                    // type: doc?.allow_multiple !== 0 ? "array" : "string",
                    title: doc?.title || `Document ${docIndex + 1}`,
                    docId: doc?.id || null,
                    indexId: idx,
                    // format: "data-url",
                    allow_multiple: doc?.allow_multiple === 0 ? false : true,
                    // ...(doc?.allow_multiple !== 0 && {
                    //   items: {
                    //     type: "string",
                    //     // format: "data-url",
                    //     width: 6,
                    //   },
                    // }),
                  };

                  /*  fieldKey !== "OTHRS"
                    ? (docUi[fieldKey] = { items: { "ui:widget": "file" } })
                    : */
                  docUi[fieldKey] = { "ui:widget": "file" };
                  docFormData[fieldKey] = "";
                });

                itemSchema.properties.documents = {
                  type: "object",
                  width: "full",
                  properties: docFields,
                  required: docRequired,
                };

                itemUiSchema.documents = docUi;
                itemFormData.documents = docFormData;

                itemSchema.required.push("documents");
              }

              groupSchema.properties[itemKey] = itemSchema;
              groupUiSchema[itemKey] = itemUiSchema;
              groupFormData[itemKey] = itemFormData;
            });

            root.properties[groupKey] = groupSchema;
            uiSchema.document.details[groupKey] = groupUiSchema;
            formData.document.details[groupKey] = groupFormData;
          } else if (value) {
            // Handle flat fields
            root.properties["name"] = {
              type: "string",
              title: "Name",
              default: data["name"],
              readOnly: true,
            };
            root.properties["hiddenField"] = {
              type: "string",
              title: "Hidden Field",
              readOnly: true,
              width: 18,
            };

            uiSchema.document.details["hiddenField"] = {
              "ui:widget": "hidden",
            };

            formData.document.details["name"] = value;
          }
        });

        // this.setFormData(() => formData);
        this.setUiSchema(() => uiSchema);
        return updatedSchema;
      });
    }

    async initializeSchema(setJsonSchema, formData) {
      this.setNextStep("additional-documents");
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/get-document`,
          {
            form_id: this.case_id,
          },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );
        let documentData = response?.data;
        this.updateJsonWithAdditionalData(documentData);
      } catch (error) {
        this.setJsonSchema((prevSchema) => ({
          ...prevSchema,
          isDisabled: true,
        }));
        this.toast?.error(error.response?.data?.message || "An error occurred");
      }
    }

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
      // this.setNextStep("ecdd-form");
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

      // Generate a dynamic UI schema based on the jsonSchema

      return {};
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
