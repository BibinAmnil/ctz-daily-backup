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
      this.setUiSchema = options.setUiSchema;
      this.masterDataUrl = masterDataUrl;
      this.isMasterDataLoaded = false; // Flag to track if master data is loaded
    }

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
    }

    async initializeSchema(setJsonSchema, formData) {}

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
        document_preview: {
          "ui:label": false,
          "ui:widget": "DocumentsPreview",
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
