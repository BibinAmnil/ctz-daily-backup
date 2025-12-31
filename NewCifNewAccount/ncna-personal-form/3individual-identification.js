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
      this.setNextStep("individual-other-information");

      if (!this.form_status?.includes("case-init")) {
        this.setJsonSchema((prevJsonSchema) => {
          return {
            ...prevJsonSchema,
            isDisabled: false,
          };
        });
      }
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
        date_of_birth_ad: ["date_of_birth_ad", "date_of_birth_bs"],

        date_of_birth_bs: ["date_of_birth_ad", "date_of_birth_bs"],

        id_issued_date_ad: ["id_issued_date_ad", "id_issued_date_bs"],

        id_issued_date_bs: ["id_issued_date_ad", "id_issued_date_bs"],

        id_expiry_date_ad: ["id_expiry_date_ad", "id_expiry_date_bs"],

        id_expiry_date_bs: ["id_expiry_date_ad", "id_expiry_date_bs"],
        national_id_issue_date_ad: [
          "national_id_issue_date_ad",
          "national_id_issue_date_bs",
        ],
        national_id_issue_date_bs: [
          "national_id_issue_date_ad",
          "national_id_issue_date_bs",
        ],
        nominee_id_issue_date_ad: [
          "nominee_id_issue_date_ad",
          "nominee_id_issue_date_bs",
        ],
        nominee_id_issue_date_bs: [
          "nominee_id_issue_date_ad",
          "nominee_id_issue_date_bs",
        ],
        beneficial_id_issue_date_ad: [
          "beneficial_id_issue_date_ad",
          "beneficial_id_issue_date_bs",
        ],
        beneficial_id_issue_date_bs: [
          "beneficial_id_issue_date_ad",
          "beneficial_id_issue_date_bs",
        ],
      };

      const [adField, bsField] = fieldMapping[fieldKey] || [];

      if (!adField || !bsField) return;

      const convertedDate = fromAdToBs
        ? this.adToBs(selectedDate)
        : this.bsToAd(selectedDate);

      setFormData((prevFormData) => {
        const updatedFormData = { ...prevFormData };
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
        } else {
          updatedFormData[adField] = fromAdToBs ? selectedDate : convertedDate;
          updatedFormData[bsField] = fromAdToBs ? convertedDate : selectedDate;
        }

        this.formData = updatedFormData;
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

      const defaultSelectedValue = (value) => {
        const selectedValue = this.functionGroup?.getRequiredDocuments(
          this.optionsData["multi_validation_mapping"],
          {
            document_type: value,
          }
        );

        return selectedValue;
      };

      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,

        "ui:order": [
          "is_customer_disabled",
          "national_id_number",
          "national_id_issue_date_ad",
          "national_id_issue_date_bs",
          "national_id_issue_place",
          "national_id_issuing_authority",
          "nid_verified",
          "nid_verify",

          "id_type_details",
          "id_type_id",
          "identification_number",
          "issue_country",

          "account_info",
          "nationality",
          "first_name",
          "middle_name",
          "last_name",
          "date_of_birth_ad",
          "date_of_birth_bs",
          "current_country",
        ],
        account_info: {
          "ui:widget": "hidden",
          "ui:label": false,
        },
        nationality: {
          "ui:widget": "hidden",
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
        date_of_birth_ad: {
          "ui:widget": "hidden",
          "ui:label": false,
        },
        date_of_birth_bs: {
          "ui:widget": "hidden",
          "ui:label": false,
        },
        current_country: {
          "ui:widget": "hidden",
        },

        is_customer_disabled: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
        },
        national_id_issue_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Issued Date (A.D)",
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            enforceAgeRestriction: false,
            validAge: 0,
            name: "national_id_issue_date_ad",
            enforceAgeRestriction: true,
            disableFutureDates: true,
            minimumDate: (formData) => {
              return (
                formData?.date_of_birth_ad &&
                this.moment(formData?.date_of_birth_ad)
                  .add(1, "day")
                  .format("YYYY-MM-DD")
              );
            },
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "national_id_issue_date_ad"
              );
            },
          },
        },
        national_id_issue_date_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            enforceAgeRestriction: true,
            disableFutureDates: true,
            validAge: 0,
            name: "national_id_issue_date_bs",
            minimumDate: (formData) => {
              return (
                formData?.date_of_birth_bs &&
                this.moment(formData?.date_of_birth_bs).format("YYYY-MM-DD")
              );
            },
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "national_id_issue_date_bs"
              );
            },
          },
        },

        nid_verify: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonPopupWidget"
            : "hidden",
          "ui:label": false,
          "ui:classNames": "mt-3 w-100",
          "ui:options": {
            onButtonClick: () => {
              this.setJsonSchema((prevJsonSchema) => ({
                ...prevJsonSchema,
                dependencies: {
                  ...prevJsonSchema.dependencies,
                  nationality: {
                    ...prevJsonSchema.dependencies.nationality,
                    then: {
                      ...prevJsonSchema.dependencies.nationality.then,
                      properties: {
                        ...prevJsonSchema.dependencies.nationality.then
                          .properties,
                        nid_verified: {
                          ...prevJsonSchema.dependencies.nationality.then
                            .properties.nid_verified,
                          readOnly: false,
                        },
                      },
                    },
                  },
                },
              }));
            },
          },
        },

        id_type_details: {
          "ui:options": {
            addable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("reporting") ||
              this.form_status?.includes("Completed")
            ),
            orderable: false,
            removable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("reporting") ||
              this.form_status?.includes("Completed")
            ),
          },
          items: {
            "ui:order": [
              "id_type_id",
              "issuing_authority",
              "identification_number",
              "issue_country",
              "issued_district",
              "id_issued_date_ad",
              "id_issued_date_bs",
              "id_expiry_date_ad",
              "id_expiry_date_bs",
              "disable",
              "removable",
              "nationality",
              "national_id_number",
              "comment",
              "citizenship_number",
            ],
            disable: {
              "ui:widget": "hidden",
            },
            removable: {
              "ui:widget": "hidden",
            },
            nationality: {
              "ui:widget": "hidden",
            },

            id_type_id: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                setDisabled: (formData, index) => {
                  return index !== 0 ? false : true;
                },
                getOptions: (formData, index) => {
                  const newSelectedData = formData?.id_type_details?.map(
                    (item, idx) => (idx !== index ? item?.id_type_id : null)
                  );
                  const filterOption =
                    this.formData?.is_nrn === "Yes"
                      ? this.functionGroup?.getRequiredDocuments(
                          this.optionsData["multi_validation_mapping"],
                          { non_resident_nepali: "default" }
                        )
                      : this.formData?.is_refugee === "Yes"
                      ? this.functionGroup?.getRequiredDocuments(
                          this.optionsData["multi_validation_mapping"],
                          { non_nepali: "default" }
                        )
                      : this.functionGroup?.getRequiredDocuments(
                          this.optionsData["multi_validation_mapping"],
                          {
                            nationality:
                              formData?.nationality ||
                              this.formData?.nationality,
                            account_type:
                              formData?.account_info ||
                              this.formData?.account_info,
                            ...((formData?.nationality ||
                              this.formData?.nationality) === "NP" && {
                              current_country:
                                formData?.current_country ||
                                this.formData?.current_country,
                            }),
                          }
                        );

                  const currentSelectedValue =
                    this.formData?.id_type_details?.[index]?.id_type_id;
                  const dropdownOptions = filterOption?.filter((item) => {
                    if (!item || !item.value || item.value.trim() === "")
                      return false;
                    return (
                      item.value === currentSelectedValue ||
                      !newSelectedData?.includes(item.value)
                    );
                  });
                  return dropdownOptions || [];
                },
                onChange: (value, index) => {
                  this.dropdownReset(
                    {
                      id_type_id: value,
                      issuing_authority:
                        defaultSelectedValue(value)?.[0]?.value,
                    },
                    "id_type_details",
                    index
                  );
                },
              },
            },
            issuing_authority: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                setDisabled: (formData, index) => {
                  return index === 0
                    ? true
                    : (formData?.nationality === "IN" &&
                        formData?.id_type_details?.[index]?.id_type_id ===
                          "DL") ||
                      (formData?.nationality !== "IN" &&
                        formData?.id_type_details?.[index]?.id_type_id === "DL")
                    ? true
                    : defaultSelectedValue(
                        formData?.id_type_details?.[index]?.id_type_id ||
                          this.formData?.id_type_details?.[index]?.id_type_id
                      )?.length === 1
                    ? true
                    : false;
                },
                getOptions: (formData, index) => {
                  return defaultSelectedValue(
                    formData?.id_type_details?.[index]?.id_type_id ||
                      this.formData?.id_type_details?.[index]?.id_type_id
                  );
                },
              },
            },

            identification_number: {
              "ui:options": {
                setDisabled: (formData, index) => {
                  return index !== 0 ? false : true;
                },
                maxLength: 30,
              },
            },

            issue_country: {
              "ui:options": {
                onChange: (value, index) => {
                  this.dropdownReset(
                    {
                      issue_country: value,
                      issued_district: value === "NP" ? null : "FORCT",
                    },
                    "id_type_details",
                    index
                  );
                },
              },
            },

            issued_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                setDisabled: (formData, index) => {
                  return index !== 0 ? false : true;
                },
                getOptions: (formData, index) => {
                  return this.filterOptions("districts");
                },
              },
            },

            id_issued_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Issued Date (A.D)",
              "ui:help": "Date Format: YYYY-MM-DD",
              "ui:options": {
                name: "id_issued_date_ad",
                enforceAgeRestriction: false,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData) => {
                  const minDateValue = this.moment(formData?.date_of_birth_ad)
                    .add(16, "years")
                    .format("YYYY-MM-DD");
                  return minDateValue && minDateValue;
                },

                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,

                    setFormData,

                    true,

                    "id_issued_date_ad",

                    "id_type_details",

                    index ? index : 0
                  );
                },
              },
            },

            id_issued_date_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:help": "Date Format: YYYY-MM-DD",
              "ui:options": {
                name: "id_issued_date_bs",
                enforceAgeRestriction: true,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData) => {
                  const minDateValue = this.NepaliDate.parseEnglishDate(
                    this.moment(formData?.date_of_birth_ad)
                      .add(16, "years")
                      .format("YYYY-MM-DD"),
                    "YYYY-MM-DD"
                  ).format("YYYY-MM-DD");
                  return minDateValue && minDateValue;
                },

                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    false,
                    "id_issued_date_bs",
                    "id_type_details",
                    index ? index : 0
                  );
                },
              },
            },

            id_expiry_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Expiry Date (A.D)",
              "ui:help": "Date Format: YYYY-MM-DD",
              "ui:options": {
                enforceAgeRestriction: false,
                validAge: 0,
                name: "id_expiry_date_ad",
                enforceAgeRestriction: true,
                enableFutureDates: true,
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    true,
                    "id_expiry_date_ad",
                    "id_type_details",
                    index ? index : 0
                  );
                },
              },
            },

            id_expiry_date_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:help": "Date Format: YYYY-MM-DD",
              "ui:options": {
                enforceAgeRestriction: true,
                name: "id_expiry_date_bs",
                validAge: 0,
                enableFutureDates: true,
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    false,
                    "id_expiry_date_bs",
                    "id_type_details",
                    index ? index : 0
                  );
                },
              },
            },

            comment: {
              "ui:widget": "textarea",
              "ui:options": {
                rows: 5,
              },
            },
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
