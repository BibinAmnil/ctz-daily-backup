(function () {
  if (window.UISchemaFactory) {
    delete window.UISchemaFactory;
  }

  class UISchemaFactory {
    constructor(masterDataUrl, options = {}) {
      this.axios = options.axios;
      this.toast = options.toast;
      this.moment = options.moment;
      this.setRenderFormKey = options.setRenderFormKey;
      this.NepaliDate = options.NepaliDate;
      this.mainRouteURL = options.mainRouteURL;
      this.form_status = options.form_status;
      this.optionsData = options.optionsData;
      this.setOptionsData = options.setOptionsData;
      this.formData = options.formData;
      this.setFormData = options.setFormData;
      this.setJsonSchema = options.setJsonSchema;
      this.setUiSchema = options.setUiSchema;
      this.setDivide = options.setDivide;
      this.adToBs = options.adToBs;
      this.bsToAd = options.bsToAd;
      this.setNextStep = options.setNextStep;
      this.schemaConditions = options.schemaConditions;
      this.case_id = options.case_id;
      this.functionGroup = options.functionGroup;
      this.setModalOpen = options.setModalOpen;
      this.nationalityChanged = false;
    }

    //Custom Validation Form Character Count and Screening Check
    customValidate(formData, errors, uiSchema) {
      function isValidMobileNumber(number, country) {
        if (typeof number === "number") {
          number = number.toString();
        }
        if (typeof number !== "string") return false;
        if (country === "NEPAL") {
          // Must be exactly 10 digits
          return /^\d{10}$/.test(number);
        } else {
          // Must be 7 to 12 digits
          return /^\d{7,12}$/.test(number);
        }
      }
      function isValidPhoneNumber(number) {
        if (typeof number === "number") {
          number = number.toString();
        }
        if (typeof number !== "string") return false;
        // Must be 7 to 12 digits
        return /^\d{7,12}$/.test(number);
      }

      if (
        formData?.phone_number &&
        !isValidPhoneNumber(formData.phone_number)
      ) {
        errors.phone_number.addError("Phone number must be 7 to 12 digits.");
      }

      if (formData?.mobile_number && formData?.mobile_country_code) {
        if (
          formData?.mobile_number !== undefined &&
          !isValidMobileNumber(
            formData.mobile_number,
            formData.mobile_country_code
          )
        ) {
          if (formData.mobile_country_code === "NEPAL") {
            errors.mobile_number.addError("Mobile number must be 10 digits.");
          } else {
            errors.mobile_number.addError(
              "Mobile number must be 7 to 12 digits."
            );
          }
        }
      }

      return errors;
    }

    //Add Loader
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

      return filteredOptions?.map((item) => ({
        label: item.title,
        value: item?.fg_code || item?.cbs_code || item?.id,
      }));
    }

    //Dropdown Reset
    dropdownReset = async (dropdownClearObject, arrayName, index) => {
      this.setFormData((prevFormData) => {
        const data = arrayName
          ? {
              ...prevFormData,
              [arrayName]: prevFormData[arrayName]?.map((item, arrIndex) => {
                return arrIndex === index
                  ? { ...item, ...dropdownClearObject }
                  : item;
              }),
            }
          : { ...prevFormData, ...dropdownClearObject };
        return data;
      });
    };

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
      this.setNextStep("individual-identification");
      if (!this.form_status?.includes("case-init")) {
        this.setJsonSchema((prevJsonSchema) => {
          return {
            ...prevJsonSchema,
            isDisabled: false,
          };
        });
      }
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
        branch: "branches",
        account_type_id: "account_types",
        account_purpose: "account_purposes",
        business_type: "business_type",
        nationality: "nationalities",
        permanent_province: "provinces",
        permanent_district: "districts",
        permanent_municipality: "local_bodies",
        current_country: "countries",
        current_province: "provinces",
        current_district: "districts",
        current_municipality: "local_bodies",
        id_type_id: "document_types",
        issue_country: "countries",
        issued_district: "districts",
        issuing_authority: "issuing_authorities",
        family_member_relation: "relationships",
        occupation_type: "occupations",
        source_of_income: "income_sources",
        permanent_country: "countries",
        relation_to_nominee: "relationships",
        account_scheme_id: "scheme_type",
        salutation: "salutations",
        gender: "genders",
        account_info: "account_category",
        mobile_country_code: "country_codes",
        phone_country_code: "country_codes",
        dedup_identification: "document_types",
        currency: "currencies",
        constitution_code_id: "constitution_types",
        customer_type_id: "customer_type_relation",
        marital_status: "marital_status",
        source_of_income: "income_sources",
        issued_district_text: "countries",
        designation: "corporate_relation",
        national_id_issuing_authority: "issuing_authorities",
        national_id_issue_place: "districts",
        beneficial_relationship: "relationships",
        literacy: "literacy",
        locker_type: "locker_type",
        educational_qualification: "education_qualifications",
        nominee_id_issuing_authority: "issuing_authorities",
        beneficial_id_issuing_authority: "issuing_authorities",
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

      this.setFormData((prevData) => ({
        ...prevData,
      }));

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

    async initializeSchema(setJsonSchema, formData) {
      if (!this.form_status?.includes("case-init")) this.setDivide(true);
      const fieldsToUpdate = [
        "branch",
        "literacy",
        "locker_type",
        "account_type_id",
        "account_purpose",
        "nationality",
        "joint_nationality",
        "guardian_nationality",
        "permanent_province",
        "family_member_relation",
        "permanent_district",
        "permanent_municipality",
        "current_country",
        "current_province",
        "current_district",
        "current_municipality",
        "id_type_id",
        "issue_country",
        "issued_district",
        "issuing_authority",
        "mobile_country_code",
        "phone_country_code",
        "occupation_type",
        "family_member_relation",
        "permanent_country",
        "account_scheme_id",
        "business_type",
        "gender",
        "salutation",
        "account_info",
        "dedup_identification",
        "currency",
        "customer_type_id",
        "constitution_code_id",
        "marital_status",
        "source_of_income",
        "issued_district_text",
        "relation_to_nominee",
        "designation",
        "national_id_issuing_authority",
        "national_id_issue_place",
        "beneficial_relationship",
        "educational_qualification",
        "nominee_id_issuing_authority",
        "beneficial_id_issuing_authority",
      ];

      for (const fieldKey of fieldsToUpdate) {
        this.updateSchemaWithEnums(fieldKey, this.optionsData, setJsonSchema);
      }
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

    createUISchema(options) {
      const {
        setJsonSchema,

        formData,

        jsonSchema,

        setFormData,

        ObjectFieldTemplate,

        ArrayFieldTemplate,

        widgets,
      } = options;

      const sameAsPermanentOnChange = (value) => {
        setTimeout(
          () =>
            this.setFormData((prevFormData) => {
              let updatedFormData = { ...prevFormData };
              updatedFormData.same_as_permanent = value;

              if (value) {
                updatedFormData = {
                  ...updatedFormData,
                  current_country: updatedFormData.permanent_country || "NP",
                  current_province: updatedFormData.permanent_province || "",
                  current_district: updatedFormData.permanent_district || "",
                  current_municipality:
                    updatedFormData.permanent_municipality || "",
                  current_ward_number:
                    updatedFormData.permanent_ward_number || "",
                  current_street_name:
                    updatedFormData.permanent_street_name || "",
                  current_town: updatedFormData.permanent_town || "",
                  current_house_number:
                    updatedFormData.permanent_house_number || "",
                  current_outside_town:
                    updatedFormData.permanent_outside_town || "",
                  current_outside_street_name:
                    updatedFormData.permanent_outside_street_name,
                  current_postal_code: updatedFormData.permanent_postal_code,
                  current_location: updatedFormData.permanent_location || "",
                  current_latitude: updatedFormData.permanent_latitude || "",
                  current_longitude: updatedFormData.permanent_longitude || "",
                };
              } else {
                updatedFormData = {
                  ...updatedFormData,
                  same_as_permanent: value,
                  current_country: "NP", // Default
                  current_province: "",
                  current_district: "",
                  current_municipality: "",
                  current_ward_number: null,
                  current_street_name: "",
                  current_town: "",
                  current_house_number: "",
                  current_outside_town: "",
                  current_outside_street_name: "",
                  current_postal_code: "",
                  current_location: "",
                  current_latitude: "",
                  current_longitude: "",
                };
              }
              return updatedFormData;
            }),
          100
        );
      };

      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,

        "ui:order": [
          "permanent_country",
          "permanent_province",
          "permanent_district",
          "permanent_municipality",
          "permanent_ward_number",
          "permanent_street_name",
          "permanent_town",
          "permanent_house_number",
          "permanent_outside_town",
          "permanent_outside_street_name",
          "permanent_postal_code",
          "residential_status",
          "permanent_location",
          "permanent_latitude",
          "permanent_longitude",

          "same_as_permanent",
          "current_country",
          "current_province",
          "current_district",
          "current_municipality",
          "current_ward_number",
          "current_street_name",
          "current_town",
          "current_house_number",
          "current_outside_town",
          "current_outside_street_name",
          "current_postal_code",
          "current_location",
          "current_latitude",
          "current_longitude",

          "contact_type",
          "mobile_country_code",
          "mobile_number",
          "phone_country_code",
          "phone_number",

          "account_info",
          "first_name",
          "middle_name",
          "last_name",
          "nationality",
        ],

        nationality: {
          "ui:widget": "hidden",
        },

        permanent_country: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                permanent_country: value,
                permanent_province: null,
                permanent_district: null,
                permanent_ward_number: null,
                permanent_street_name: "",
                permanent_town: "",
                permanent_house_number: "",
                permanent_outside_town: "",
                permanent_outside_street_name: "",
                permanent_postal_code: "",
              });
            },
          },
        },

        permanent_province: {
          "ui:options": {
            onChange: (value) =>
              this.dropdownReset({
                permanent_province: value,

                permanent_district: null,

                permanent_municipality: null,

                permanent_ward_number: null,

                permanent_street_name: "",

                permanent_town: "",

                permanent_house_number: "",
              }),
          },
        },

        permanent_district: {
          "ui:widget": "CascadeDropdown",

          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "districts",
                formData?.permanent_province
              );
            },

            onChange: (value) =>
              this.dropdownReset({
                permanent_district: value,
                permanent_municipality: null,
                permanent_ward_number: null,
                permanent_street_name: "",
                permanent_town: "",
                permanent_house_number: "",
              }),
          },
        },

        permanent_municipality: {
          "ui:widget": "CascadeDropdown",

          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "local_bodies",

                formData?.permanent_district
              );
            },
          },
        },

        permanent_location: {
          "ui:widget": widgets.MapWidget,
          "ui:options": {
            latitude_key: "permanent_latitude",
            longitude_key: "permanent_longitude",
            onMapChange: (data) => {
              setTimeout(() => {
                this.setFormData((preData) => ({
                  ...preData,
                  permanent_latitude: String(data?.permanent_location_latitude),
                  permanent_longitude: String(
                    data?.permanent_location_longitude
                  ),
                }));
              }, 600);
            },
          },
        },

        current_location: {
          "ui:widget": widgets.MapWidget,
          "ui:options": {
            latitude_key: "current_latitude",
            longitude_key: "current_longitude",
            onMapChange: (data) => {
              setTimeout(() => {
                this.setFormData((preData) => ({
                  ...preData,
                  current_latitude: String(data?.current_location_latitude),
                  current_longitude: String(data?.current_location_longitude),
                }));
              }, 600);
            },
          },
        },

        same_as_permanent: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) => {
              sameAsPermanentOnChange(value);
            },
          },
        },

        current_country: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                current_country: value,
                current_province: null,
                current_municipality: null,
                current_district: null,
                current_outside_town: "",
                current_outside_street_name: "",
                current_postal_code: "",
              });
            },
          },
        },
        current_province: {
          "ui:placeholder": "Select Current Province",
          "ui:options": {
            onChange: (value) =>
              this.dropdownReset({
                current_province: value,
                current_district: null,
                current_municipality: null,
                current_ward_number: null,
                current_street_name: "",
                current_town: "",
                current_house_number: "",
              }),
          },
        },
        current_district: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "districts",
                formData?.current_province
              );
            },
            onChange: (value) =>
              this.dropdownReset({
                current_district: value,
                current_municipality: null,
                current_ward_number: null,
                current_street_name: "",
                current_town: "",
                current_house_number: "",
              }),
          },
        },

        current_municipality: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "local_bodies",

                formData?.current_district
              );
            },
          },
        },

        current_street_name: {
          "ui:placeholder": "Enter Tole/Street",

          "ui:options": {},
        },
        current_town: {
          "ui:options": {},
        },
        current_house_number: {
          "ui:placeholder": "Enter House Number",

          "ui:options": {},
        },
        current_outside_town: {
          "ui:placeholder": "Enter Town Name",

          "ui:options": {},
        },

        mobile_number: {
          "ui:options": {
            inputMode: "decimal",
            onInput: (e) => {
              e.currentTarget.value = e.currentTarget.value.replace(
                /[^0-9]/g,
                ""
              );
            },
            maxLength: 12,
          },
        },

        phone_number: {
          "ui:options": {
            inputMode: "decimal",
            onInput: (e) => {
              e.currentTarget.value = e.currentTarget.value.replace(
                /[^0-9]/g,
                ""
              );
            },
            maxLength: 12,
          },
        },

        account_info: {
          "ui:widget": "hidden",
          "ui:label": false,
        },
        first_name: {
          "ui:widget": "hidden",
          "ui:label": false,
        },
        middle_name: {
          "ui:widget": "hidden",
          "ui:label": false,
        },
        last_name: {
          "ui:widget": "hidden",
          "ui:label": false,
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
