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

    filterMasterData(masterDataKey, formData) {
      const strictKey = "account_type_id";
      const softKeys = ["currency", "nationality"];

      return this.optionsData?.[masterDataKey]
        ?.filter((item) => {
          const relationMatch =
            item.individual === formData?.account_info ||
            item.joint === formData?.account_info ||
            item.minor === formData?.account_info;

          if (!relationMatch) return false;

          if (
            formData?.[strictKey] &&
            item?.[strictKey] !== formData?.[strictKey]
          ) {
            return false;
          }

          const softMatch = softKeys?.every((key) => {
            if (!formData[key]) return true;
            const itemValue = item[key];
            if (itemValue == null) return true;
            if (Array.isArray(itemValue)) {
              return itemValue.includes(formData[key]);
            }
            return itemValue === formData?.[key];
          });

          return softMatch;
        })
        .map((item) => ({
          label: `${item.title} - ${item?.cbs_code}`,
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
      this.setNextStep("individual-address");
      if (!this.form_status?.includes("case-init")) {
        this.setJsonSchema((prevJsonSchema) => {
          return {
            ...prevJsonSchema,
            isDisabled: false,
          };
        });
      }
    }

    convertToArray(value, key, parentKey, comparisionKey) {
      setTimeout(() => {
        this.setFormData((prevData) => {
          if (!prevData[parentKey]) return prevData;
          if (!comparisionKey || comparisionKey.length === 0) {
            return {
              ...prevData,
              [parentKey]: prevData[parentKey]?.map((data, index) =>
                index === 0 ? { [key]: value } : data
              ),
            };
          }

          const updatedArray = prevData[parentKey].map((item) => {
            if (Object.keys(item).length === 0) return { [key]: value };

            if (
              comparisionKey &&
              item[comparisionKey[1]] === prevData[comparisionKey[0]]
            ) {
              return { ...item, [key]: value };
            }

            return item;
          });

          if (
            comparisionKey &&
            !updatedArray.some(
              (item) => item[comparisionKey[1]] === prevData[comparisionKey[0]]
            )
          ) {
            updatedArray.push({
              [comparisionKey[1]]: prevData[comparisionKey[0]],
              [key]: value,
            });
          }

          return {
            ...prevData,
            [parentKey]: updatedArray,
          };
        });
      }, 100);
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

    async familyNameChange(fieldName, value, arrayPath, index) {
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
        this.setRenderFormKey((prevData) => {
          return prevData + 1;
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

            delete cleaned.family_not_available;

            return cleaned;
          }
        );

        result.family_information = cleanedFamilyInfo;
      }

      if (
        "id_type_details" in this.formData &&
        Array.isArray(this.formData.id_type_details) &&
        this.formData.id_type_details.length > 0
      ) {
        const [firstItem, ...restItems] = this.formData.id_type_details;

        // // Filter remaining items for valid id_type_id
        // const matchingItems = restItems.filter(
        //   (item) => item?.id_type_id === validId
        // );

        // // Always include the first item, plus any valid matches from the rest
        result.id_type_details = this.formData.id_type_details?.map(
          (item, index) => ({
            id_type_id: item?.id_type_id,
            identification_number: index === 0 && item?.identification_number,
            ...(item?.removable === false && { removable: item?.removable }),
          })
        );
      }
      /* setTimeout(() => */ this.setFormData(result) /* , 100) */;

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

        jsonSchema,

        setFormData,

        ObjectFieldTemplate,

        ArrayFieldTemplate,

        widgets,
      } = options;

      const handleSetNotAvailable = (value, keyName) => {
        setTimeout(
          () =>
            this.setFormData((prevFormData) => {
              const updatedFormData = {
                ...prevFormData,
                [keyName]: value ? "N/A" : "",
              };

              return updatedFormData;
            }),
          50
        );
      };

      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,

        "ui:order": [
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

          "extra_gap",
          "dedup_check",
          "dedup_module_data",
        ],

        connectedPairs: [
          ["last_name", "last_name_not_available"],
          ["email", "email_not_available"],
        ],

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
                account_scheme_id: null,
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
            setDisabled: (formData) => formData?.blacklist_account,
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

        nationality: {},

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
