(function () {
  if (window.UISchemaFactory) {
    delete window.UISchemaFactory;
  }

  class UISchemaFactory {
    constructor(masterDataUrl, options = {}) {
      this.functionGroup = options.functionGroup;
      this.axios = options.axios;
      this.toast = options.toast;
      this.NepaliDate = options.NepaliDate;
      this.moment = options.moment;
      this.setRenderFormKey = options.setRenderFormKey;
      this.mainRouteURL = options.mainRouteURL;
      this.form_status = options.form_status;
      this.optionsData = options.optionsData;
      this.setOptionsData = options.setOptionsData;
      this.setModalOpen = options.setModalOpen;
      this.setDivide = options.setDivide;
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
      this.nationalities_mapping;
      this.case_id = options.case_id;
      this.nationalityChanged = false;
    }

    //Custom Validation Form Character Count and Screening Check
    customValidate(formData, errors, uiSchema) {
      const familyInfo = formData?.family_information;
      const requiredFields = ["family_member_full_name"]; // Add more fields here as needesd
      if (Array.isArray(familyInfo)) {
        familyInfo.forEach((member, index) => {
          requiredFields.forEach((field) => {
            const value = member?.[field]?.toString().trim();
            if (!value) {
              errors.family_information ??= [];
              errors.family_information[index] ??= {};
              errors.family_information[index][field] ??= {};
              errors.family_information[index][field].addError("Required");
            }
          });
        });
      }

      return errors;
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
      if (!(this.optionsData[key]?.length > 0))
        return this.findRequiredDocuments(
          this.nationalities_mapping,
          ["nationality", "account_type"],
          cascadeValue
        );
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

    filterOptionsCustomer(key, cascadeValue) {
      if (!this.optionsData[key]) return [];

      const TARGET_CASCADE = "NP";

      const filteredOptions = cascadeValue
        ? cascadeValue === TARGET_CASCADE
          ? this.optionsData[key].filter(
              (item) => item.cascade_id === TARGET_CASCADE
            )
          : this.optionsData[key].filter((item) => item.cascade_id === "")
        : this.optionsData[key];

      return filteredOptions.map((item) => ({
        label: item.title,
        value: item?.fg_code || item?.cbs_code || item?.id,
      }));
    }

    filterMasterData(masterDataKey, formData) {
      const strictKey = "account_type_id";
      const softKeys = ["currency", "nationality"];

      return this.optionsData[masterDataKey]
        .filter((item) => {
          // Step 1: Relation must match
          const relationMatch =
            item.individual === formData.account_info ||
            item.joint === formData.account_info ||
            item.minor === formData.account_info;

          if (!relationMatch) return false;

          // Step 2: Strict match for account_type_id
          if (formData[strictKey] && item[strictKey] !== formData[strictKey]) {
            return false;
          }

          // Step 3: Soft match: check value or null (currency can be array)
          const softMatch = softKeys.every((key) => {
            if (!formData[key]) return true;

            const itemValue = item[key];

            // Check for null or matching
            if (itemValue == null) return true;

            // If it's an array, check includes
            if (Array.isArray(itemValue)) {
              return itemValue.includes(formData[key]);
            }

            // Fallback to direct match
            return itemValue === formData[key];
          });

          return softMatch;
        })
        .map((item) => ({
          label: `${item.title} - ${item?.cbs_code}`,
          value: item?.fg_code || item?.cbs_code || item?.id,
        }));
    }

    dropdownReset = async (dropdownClearObject, arrayNames, indices) => {
      setTimeout(() => {
        this.setFormData((prevFormData) => {
          let data = { ...prevFormData };

          if (Array.isArray(arrayNames) && Array.isArray(indices)) {
            arrayNames.forEach((arrayName, idx) => {
              const targetIndex = indices[idx];
              if (Array.isArray(data[arrayName])) {
                data[arrayName] = data[arrayName].map((item, arrIndex) =>
                  arrIndex === targetIndex
                    ? { ...item, ...dropdownClearObject }
                    : item
                );
              }
            });
          } else if (
            typeof arrayNames === "string" &&
            typeof indices === "number"
          ) {
            if (Array.isArray(data[arrayNames])) {
              data[arrayNames] = data[arrayNames].map((item, arrIndex) =>
                arrIndex === indices
                  ? { ...item, ...dropdownClearObject }
                  : item
              );
            }
          } else {
            data = { ...data, ...dropdownClearObject };
          }
          return data;
        });
      }, 100);
    };

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
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
        this.formData = updatedFormData;
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
        occupation_type: "occupations",
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
        customer_type_id: "customer_types",
        marital_status: "marital_status",
        source_of_income: "income_sources",
        issued_district_text: "countries",
        designation: "corporate_relation",
        national_id_issuing_authority: "issuing_authorities",
        national_id_issue_place: "districts",
        beneficial_relationship: "relationships",
        literacy: "literacy",
        educational_qualification: "education_qualifications",
        locker_type: "locker_type",
        nominee_id_issuing_authority: "issuing_authorities",
        beneficial_id_issuing_authority: "issuing_authorities",
        religion: "religion",
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
              // field.enumNames = [...enumNames];
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
      setTimeout(
        () =>
          this.setFormData((prevFormData) => {
            const updatedFamilyDetails = [...prevFormData[arrayPath]];
            updatedFamilyDetails[index] = {
              ...updatedFamilyDetails[index],
              is_family_name_not_available: value,
              [fieldName]: value ? "Family Not Available" : "",
            };

            return {
              ...prevFormData,
              [arrayPath]: updatedFamilyDetails,
            };
          }),
        this.setUiSchema((prevUiSchema) => {
          const updatedFamilyDetails = [
            ...prevUiSchema[arrayPath]["ui:options"]["disableSpecificKeys"],
          ];

          updatedFamilyDetails[index] = {
            ...updatedFamilyDetails[index],
            [fieldName]: value ? index : null,
          };

          return {
            ...prevUiSchema,
            [arrayPath]: {
              ...prevUiSchema[arrayPath],
              ["ui:options"]: {
                ...prevUiSchema[arrayPath]["ui:options"],
                disableSpecificKeys: updatedFamilyDetails,
              },
            },
          };
        }),
        100
      );
      this.setRenderFormKey((prevData) => {
        return prevData + 1;
      });
    }

    async initializeSchema(setJsonSchema, formData) {
      if (!this.form_status?.includes("case-init")) {
        this.setDivide(true);
      }
      this.setNextStep("joint-address");

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
        "permanent_country",
        "account_scheme_id",
        "business_type",
        "gender",
        "salutation",
        "account_info",
        "dedup_identification",
        "currency",
        "religion",
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

    async formDataCleaner(fields) {
      if (typeof this.formData !== "object" || this.formData === null)
        return {};

      const result = {};

      // Keep only specified fields
      for (const key of fields) {
        if (key in this.formData) {
          result[key] = this.formData[key];
        }
      }

      // Handle family_information cleanup
      if (
        "family_information" in this.formData &&
        Array.isArray(this.formData.family_information) &&
        this.formData.family_information.length > 0
      ) {
        const cleanedFamilyInfo = this.formData.family_information.map(
          (item, index) => {
            if (index === 0) return item;
            const cleaned = { ...item };
            delete cleaned.family_member_full_name;
            delete cleaned.is_family_name_not_available;
            return cleaned;
          }
        );
        result.family_information = cleanedFamilyInfo;
      }

      // Handle id_type_details cleanup (only keep first item)
      if (
        "id_type_details" in this.formData &&
        Array.isArray(this.formData.id_type_details) &&
        this.formData.id_type_details.length > 0
      ) {
        const cleanedIdTypes = this.formData.id_type_details.map(
          (item, index) => ({
            id_type_id: item?.id_type_id,
            identification_number: index === 0 && item?.identification_number,
            ...(item?.removable === false && { removable: item?.removable }),
          })
        );
        result.id_type_details = cleanedIdTypes;
      }

      setTimeout(() => this.setFormData(result), 100);
      return result;
    }

    async updateFamilyInformation(value) {
      const { family_information = [] } = this.formData;

      const MARRIED_STATUS_ID = "MARRD";
      const SPOUSE_RELATION_ID = "SPOUS";

      const updatedFamilyInfo = Array.isArray(family_information)
        ? [...family_information]
        : [];

      if (value === MARRIED_STATUS_ID) {
        const spouseExists = updatedFamilyInfo.some(
          (member) =>
            member.family_member_relation?.toLowerCase().trim() ===
            SPOUSE_RELATION_ID.toLowerCase()
        );

        if (!spouseExists) {
          updatedFamilyInfo.push({
            family_member_relation: SPOUSE_RELATION_ID,
            family_member_full_name: "", // Placeholder
          });

          this.setUiSchema((prevSchema) => {
            const updatedUiSchema = {
              ...prevSchema,
              family_information: {
                ...prevSchema.family_information,
                "ui:options": {
                  ...prevSchema?.family_information["ui:options"],
                  disableSpecificKeys: this.form_status.includes("init")
                    ? [
                        { family_member_relation: 0 },
                        { family_member_relation: 1 },
                        { family_member_relation: 2 },
                        { family_member_relation: 3 },
                      ]
                    : [
                        {
                          family_member_relation: 0,
                          family_member_full_name: 0,
                          is_family_name_not_available: 0,
                        },

                        {
                          family_member_relation: 1,
                          family_member_full_name: 1,
                          is_family_name_not_available: 1,
                        },

                        {
                          family_member_relation: 2,
                          family_member_full_name: 2,
                          is_family_name_not_available: 2,
                        },
                        {
                          family_member_relation: 3,
                          family_member_full_name: 3,
                          is_family_name_not_available: 3,
                        },
                      ],
                },
              },
            };
            return updatedUiSchema;
          });
        } else {
          this.setUiSchema((prevSchema) => {
            const updatedUiSchema = {
              ...prevSchema,
              family_information: {
                ...prevSchema.family_information,
                "ui:options": {
                  ...prevSchema?.family_information["ui:options"],
                  disableSpecificKeys: this.form_status.includes("init")
                    ? [
                        { family_member_relation: 0 },
                        { family_member_relation: 1 },
                        { family_member_relation: 2 },
                        { family_member_relation: 3 },
                      ]
                    : [
                        {
                          family_member_relation: 0,
                          family_member_full_name: 0,
                          is_family_name_not_available: 0,
                        },

                        {
                          family_member_relation: 1,
                          family_member_full_name: 1,
                          is_family_name_not_available: 1,
                        },

                        {
                          family_member_relation: 2,
                          family_member_full_name: 2,
                          is_family_name_not_available: 2,
                        },
                        {
                          family_member_relation: 3,
                          family_member_full_name: 3,
                          is_family_name_not_available: 3,
                        },
                      ],
                },
              },
            };
            return updatedUiSchema;
          });
        }
      } else {
        this.setUiSchema((prevSchema) => {
          const updatedUiSchema = {
            ...prevSchema,
            family_information: {
              ...prevSchema.family_information,
              "ui:options": {
                ...prevSchema?.family_information["ui:options"],
                disableSpecificKeys: this.form_status.includes("init")
                  ? [
                      { family_member_relation: 0 },
                      { family_member_relation: 1 },
                      { family_member_relation: 2 },
                    ]
                  : [
                      {
                        family_member_relation: 0,
                        family_member_full_name: 0,
                        is_family_name_not_available: 0,
                      },

                      {
                        family_member_relation: 1,
                        family_member_full_name: 1,
                        is_family_name_not_available: 1,
                      },

                      {
                        family_member_relation: 2,
                        family_member_full_name: 2,
                        is_family_name_not_available: 2,
                      },
                    ],
              },
            },
          };
          return updatedUiSchema;
        });
      }

      this.setFormData((prevData) => {
        const updatedData = {
          ...prevData,
          family_information: updatedFamilyInfo,
        };
        return updatedData;
      });
    }

    createUISchema(options) {
      const {
        setJsonSchema,
        formData,
        setFormData,
        ObjectFieldTemplate,
        ArrayFieldTemplate,
        jsonSchema,
        widgets,
      } = options;

      const handleSetNotAvailable = (value, keyName) => {
        setTimeout(
          () =>
            setFormData((prevFormData) => {
              const updatedFormData = {
                ...prevFormData,
                [keyName]:
                  this.formData?.[keyName] !== "N/A" && value
                    ? "N/A"
                    : this.formData?.[keyName],
              };

              return updatedFormData;
            }),
          100
        );
      };

      this.initializeSchema(setJsonSchema, formData);
      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": [
          "is_minor_account",
          "has_cif",
          "cif_number",
          "cif_enquiry",

          "account_info",
          "branch",
          "account_type_id",
          "currency",
          "account_scheme_id",
          "pension",
          "staff_id",
          "dmat_number",
          "ssn",
          "customer_type_id",
          "account_purpose",
          "customer_status",
          "multiple_account",
          "multiple_currency",
          "multiple_account_number",
          "salutation",
          "first_name",
          "middle_name",
          "last_name",
          "last_name_not_available",
          "father_name",
          "date_of_birth_ad",
          "date_of_birth_bs",
          "is_nrn",
          "is_refugee",
          "nationality",
          "dedup_identification",
          "dedup_id_number",

          "gender",
          "marital_status",
          "religion",
          "email",
          "email_not_available",
          "literacy",
          "educational_qualification",
          "is_bank_staff",
          "staff_id",
          "is_us_person",

          "family_information",
        ],
        connectedPairs: [
          ["last_name", "last_name_not_available"],
          ["email", "email_not_available"],
        ],

        is_minor_account: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
        },

        account_purpose: {
          "ui:placeholder": "Select Purpose of Account",
        },

        account_info: {
          "ui:widget": "CustomRadioWidget",
          "ui:label": false,
        },

        account_type_id: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                account_type_id: value,
                account_scheme_id: null,
                currency: null,
                customer_type_id: null,
              });
            },
          },
        },

        currency: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData, index) => this.filterOptions("currencies"),
            onChange: (value) => {
              this.dropdownReset({
                currency: value,
                multiple_currency: null,
              });
            },
          },
        },
        multiple_currency: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData, index) => {
              const filterOption = this.filterOptions("currencies");
              // Only show currencies not currently selected
              const dropdownOptions = filterOption?.filter(
                (item) => item?.value !== formData?.currency
              );

              return dropdownOptions || [];
            },
          },
        },
        multiple_account_number: {
          "ui:widget": this.formData?.case_status?.includes("Completed")
            ? "TextWidget"
            : "hidden",
        },

        account_scheme_id: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) =>
              this.filterMasterData("scheme_type", formData),
          },
        },

        screening_ref_code: {
          "ui:widget": "hidden",
        },

        staff_id: {
          "ui:options": {
            maxLength: 10,
          },
        },

        is_customer_disabled: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
        },

        last_name: {
          "ui:disabled": true,
        },

        marital_status: {
          "ui:options": {
            onChange: (value) => {
              this.updateFamilyInformation(value);
            },
          },
        },

        has_cif: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) =>
              !value &&
              setFormData((prev) => ({
                account_info: prev?.account_info,
                id_type_details: [{ id_type_id: "CTZN" }],
              })),
          },
        },

        educational_qualification: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions("education_qualifications");
            },
          },
        },
        customer_type_id: {},

        dedup_identification: {},

        dedup_id_number: {
          "ui:options": {
            onBlurCapture: (event) =>
              this.convertToArray(
                event?.target?.value,
                "identification_number",
                "id_type_details",
                ["dedup_identification", "id_type_id"]
              ),
          },
        },

        father_name: {
          "ui:options": {},
        },

        personal_screening_data: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
          showCheckbox: this.form_status?.includes("init") ? true : false,
          showViewedColumn: true,
          fixedActionsColumn: true,
          showFooter: true,
          "ui:options": {
            onCheckboxChange: (tableData, category, checked) => {
              this.setFormData((prevData) => ({
                ...prevData,
                [category === "pep_nba"
                  ? "pep"
                  : category === "sanction_moha"
                  ? "sanction"
                  : category]: checked ? "Yes" : "No",
                personal_screening_data: tableData,
              }));
            },
            actionHandlers: {
              view: (record) => setIsModalVisible(true),
            },
          },
        },

        salutation: {
          "ui:widget": "CustomRadioWidget",
          "ui:options": {
            onChange: (value) =>
              setTimeout(() => {
                this.dropdownReset({
                  salutation: value,
                  gender: value === "MR." ? "M" : "F",
                });
              }, 600),
          },
        },

        gender: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions("genders", formData?.salutation);
            },
          },
        },

        cif_enquiry: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:classNames": "d-flex h-100 mt-5 align-items-center",
          "ui:options": {},
        },

        last_name_not_available: {
          "ui:widget": "CustomCheckBoxWidget",

          "ui:label": false,

          "ui:options": {
            onChange: (value) => handleSetNotAvailable(value, "last_name"),
          },
        },

        date_of_birth_ad: {
          "ui:widget": widgets.CustomDatePicker,

          "ui:placeholder": "Select Date of Birth (A.D)",
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            name: "date_of_birth_ad",

            enforceAgeRestriction: true,

            validAge: 18,

            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,

                setFormData,

                true,

                "date_of_birth_ad"
              );
            },
          },
        },

        date_of_birth_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            enforceAgeRestriction: true,

            name: "date_of_birth_bs",

            validAge: 18,

            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,

                setFormData,

                false,

                "date_of_birth_bs"
              );
            },
          },
        },

        email_not_available: {
          "ui:widget": "CustomCheckBoxWidget",

          "ui:label": false,

          "ui:options": {
            onChange: (value) => handleSetNotAvailable(value, "email"),
          },
        },

        nationality: {
          "ui:options": {
            onChange: async (value) => {
              this.dropdownReset({
                nationality: value,
                dedup_identification:
                  value === "NP" ? "CTZN" : value === "IN" ? null : "PP",
                permanent_country:
                  value === "NP" ? "NP" : this.formData?.permanent_country,
                currency: null,
                account_scheme_id: null,
                customer_type_id: null,

                id_type_details:
                  value === "NP" || value === "IN"
                    ? [{}]
                    : [
                        {
                          id_type_id: "PP",
                        },
                        {
                          removable: false,
                          id_type_id: "TRDOC",
                          issue_country: "NP",
                        },
                      ],
                national_id_number: "",
                national_id_issue_date_ad: undefined,
                national_id_issue_date_bs: undefined,
                national_id_issue_place: null,
              });
              (await value) !== "IN" && (this.nationalityChanged = true);
              return null;
            },
          },
        },

        family_information: {
          "ui:widget": "EditableTableWidget",
          "ui:label": false,
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
            fieldKeys: [
              "family_member_relation",
              "family_member_relation",
              "family_member_full_name",
              "is_family_name_not_available",
            ],
            disableSpecificKeys: this.form_status.includes("init")
              ? [
                  { family_member_relation: 0 },

                  { family_member_relation: 1 },

                  { family_member_relation: 2 },
                ]
              : [
                  {
                    family_member_relation: 0,

                    family_member_full_name: 0,

                    is_family_name_not_available: 0,
                  },

                  {
                    family_member_relation: 1,

                    family_member_full_name: 1,

                    is_family_name_not_available: 1,
                  },

                  {
                    family_member_relation: 2,

                    family_member_full_name: 2,

                    is_family_name_not_available: 2,
                  },
                ],
          },
          items: {
            family_member_relation: {
              "ui:widget": "CascadeDropdown",
              "ui:placeholder": "Select Relationship",
              "ui:disabled": true,
              "ui:options": {
                getOptions: (formData, rowIndex) => {
                  const familyInfo = formData?.family_information || [];

                  const currentValue =
                    familyInfo[rowIndex]?.family_member_relation?.trim() || "";

                  const usedBefore = familyInfo
                    .slice(0, rowIndex)
                    .map((item) => item?.family_member_relation?.trim())
                    .filter(Boolean);

                  return (this.filterOptions("relationships") || []).filter(
                    (opt) => {
                      const val = opt?.value?.trim();
                      if (!val) return false;
                      if (val === currentValue) return true;
                      return !usedBefore.includes(val);
                    }
                  );
                },
              },
            },

            family_member_full_name: {
              "ui:placeholder": "Enter Full Name",
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.form_status.includes("init") ||
                  this.form_status.includes("update")
                    ? formData?.family_information?.[index ?? 0]
                        ?.is_family_name_not_available ??
                      (formData?.family_information?.[index ?? 0]
                        ?.family_member_relation === "FATHE" &&
                      formData?.father_name
                        ? true
                        : false)
                    : true,
              },
            },

            is_family_name_not_available: {
              "ui:widget": "CustomCheckBoxWidget",

              "ui:options": {
                setDisabled: (formData, index) =>
                  /* !this?.formData?.cif_data
                    ? */ this.form_status.includes("init") ||
                  this.form_status.includes("update")
                    ? formData?.family_information?.[index ?? 0]
                        ?.family_member_relation === "FATHE" &&
                      formData?.father_name
                      ? true
                      : false
                    : true,
                // : true,

                onChange: (value, index) => {
                  this.familyNameChange(
                    "family_member_full_name",

                    value,

                    "family_information",

                    index ?? 0
                  );
                },
              },
            },
          },
        },
        cif_data: {
          "ui:widget": "hidden",
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
