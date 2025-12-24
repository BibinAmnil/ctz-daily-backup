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
      const hasUncheckedView = Object.keys(
        formData?.personal_screening_data || {}
      ).map((key) => {
        const items = formData.personal_screening_data[key];

        return (
          Array.isArray(items) &&
          items.every(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              item.hasOwnProperty("isCheckedView")
          )
        );
      });
      const addHasUncheckedView = hasUncheckedView.some(
        (value) => value === false
      );
      // if (addHasUncheckedView) {
      //   errors?.personal_screening_data?.addError(
      //     "View all Screening Data To Continue"
      //   );
      // }

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

      // Validate mobile_number pattern based on mobile_country_code
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
        !isValidPhoneNumber(formData?.phone_number)
      ) {
        errors.phone_number.addError("Phone number must be 7 to 12 digits.");
      }

      if (formData?.mobile_number && formData?.mobile_country_code) {
        if (
          formData?.mobile_number !== undefined &&
          !isValidMobileNumber(
            formData?.mobile_number,
            formData?.mobile_country_code
          )
        ) {
          if (formData?.mobile_country_code === "NEPAL") {
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

    filterOptionsOccupation(key, childKey, cascadeValue) {
      if (!this.optionsData[key]) return [];

      const filteredOptions = cascadeValue
        ? this.optionsData[key][childKey]?.filter((item) =>
            item.cascade_id?.includes(cascadeValue)
          ) || []
        : this.optionsData[key][childKey];

      return filteredOptions
        ?.filter((item) => item?.id !== "remaining all occopation code")
        ?.map((item) => ({
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
      this.formData = JSON.parse(JSON.stringify(formData));
      const next_step = schemaConditions?.accountInfo?.find(
        (item) => item?.account_type === this.formData?.account_info
      )?.step_slug;

      if (next_step) {
        this.setNextStep(next_step);
      }
      if (!this.form_status?.includes("case-init")) {
        this.setJsonSchema((prevJsonSchema) => {
          return {
            ...prevJsonSchema,
            isDisabled: false,
          };
        });
      }

      if (
        this.moment(formData?.date_of_birth_ad).isBefore(
          this.moment().subtract(80, "years")
        )
      ) {
        this.setUiSchema((prevUiSchema) => {
          return {
            ...prevUiSchema,
            date_of_birth_bs: {
              ...prevUiSchema?.date_of_birth_bs,
              "ui:widget": this.moment(
                this.formData?.date_of_birth_ad
              ).isBefore(this.moment().subtract(80, "years"))
                ? "TextWidget"
                : widgets.NepaliDatePickerR,
            },
          };
        });
      }
    }

    preprocessData(data) {
      if (!data) return "Empty";
      if (!Array.isArray(data)) {
        data = [data];
      }
      return data.reduce((acc, entry, index) => {
        if (typeof entry !== "object" || entry === null) return acc;
        const { source, ...rest } = entry;
        if (source && source.includes("institution")) return acc;
        const flatEntry = { key: index };
        for (const key in rest) {
          if (Array.isArray(rest[key]?.items)) {
            flatEntry[key] = rest[key].items.map((item) => ({ value: item }));
          } else {
            flatEntry[key] = rest[key] || "-";
          }
        }
        if (source) {
          if (!acc[source]) {
            acc[source] = [flatEntry];
          } else {
            acc[source].push(flatEntry);
          }
        } else {
          acc["Dedup Check"] = acc["Dedup Check"] || [];
          acc["Dedup Check"].push(flatEntry);
        }
        return acc;
      }, {});
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

        source_of_income: "income_sources",
        employment_type: "employment_statuses",

        permanent_country: "countries",

        relation_to_nominee: "relationships",

        account_scheme_id: "scheme_type",

        salutation: "salutations",

        gender: "genders",

        religion: "religion",

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
        literacy: "literacy",
        educational_qualification: "education_qualifications",
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
        // this.setUiSchema((prevUiSchema) => {

        //   const updatedFamilyDetails = [

        //     ...prevUiSchema[arrayPath]["ui:options"]["disableSpecificKeys"],

        //   ];

        //   updatedFamilyDetails[index] = {

        //     ...updatedFamilyDetails[index],

        //     [fieldName]: value ? index : null,

        //   };

        //   return {

        //     ...prevUiSchema,

        //     [arrayPath]: {

        //       ...prevUiSchema[arrayPath],

        //       ["ui:options"]: {

        //         ...prevUiSchema[arrayPath]["ui:options"],

        //         disableSpecificKeys: updatedFamilyDetails,

        //       },

        //     },

        //   };

        // }),

        this.setRenderFormKey((prevData) => {
          return prevData + 1;
        });
    }

    async initializeSchema(setJsonSchema, formData) {
      if (!this.form_status?.includes("case-init")) this.setDivide(true);
      const fieldsToUpdate = [
        "account_type_id",
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
        "employment_type",
        "permanent_country",
        "account_scheme_id",
        "business_type",
        "gender",
        "religion",
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
        "literacy",
        "educational_qualification",
        "account_purpose",
        "mode_of_operation",
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

    async formDataCleaner(fields, formData) {
      if (typeof formData !== "object" || formData === null) return {};

      const result = {};

      // Keep only specified fields

      for (const key of fields) {
        if (key in formData) {
          result[key] = formData[key];
        }
      }

      // Handle family_information cleanup

      if (
        "family_information" in formData &&
        Array.isArray(formData.family_information) &&
        formData.family_information.length > 0
      ) {
        const cleanedFamilyInfo = formData.family_information.map(
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

      // Handle id_type_details cleanup (only keep first item)

      const validId = "e89c962c-0530-4950-bfa6-30bbbd874665";

      if (
        "id_type_details" in formData &&
        Array.isArray(formData.id_type_details) &&
        formData.id_type_details.length > 0
      ) {
        const [firstItem, ...restItems] = formData.id_type_details;

        // // Filter remaining items for valid id_type_id
        // const matchingItems = restItems.filter(
        //   (item) => item?.id_type_id === validId
        // );

        // // Always include the first item, plus any valid matches from the rest
        result.id_type_details = formData.id_type_details?.map(
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
      !this.formData?.case_status && (this.nationalityChanged = true);

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
                };
              } else {
                updatedFormData = {
                  ...updatedFormData,
                  same_as_permanent: undefined,
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
                };
              }
              return updatedFormData;
            }),

          100
        );
      };

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

          "extra_gap",
          "dedup_check",
          "dedup_module_data",

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

          "contact_type",

          "mobile_country_code",

          "mobile_number",

          "phone_country_code",

          "phone_number",

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

          "has_nominee",

          "nominee_full_name",

          "relation_to_nominee",

          "nominee_father_name",

          "nominee_grandfather_name",

          "nominee_contact_number",

          "employment_type",
          "other_employment_type",
          "source_of_income",
          "other_source_of_income",
          "occupation_type",
          "occupation_detail",

          "mode_of_operation",
          "remarks",

          "pep",

          "pep_category",

          "pep_declaration",

          "family_pep_declaration",

          "adverse_media",

          "adverse_category",

          "entitled_with_fund",

          "loan_status",

          "is_blacklisted",

          "personal_info_screening",
          "screening_filter",
          "blacklist_min_score",
          "sanction_min_score",
          "pep_min_score",
          "adverse_media_min_score",
          "max_result",
          "personal_screening_data",
          "screening_ref_code",

          "is_existing_cif",

          "is_block_list",

          "scheme_check",

          "is_cib_list",

          "is_sanction",
          "cif_data",
          "source",
          "has_related_party",
        ],
        connectedPairs: [
          ["last_name", "last_name_not_available"],
          ["email", "email_not_available"],
        ],

        has_cif: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) =>
              !value &&
              /*    setTimeout(
                () => */
              setFormData((prev) => ({
                account_info: prev?.account_info,
                id_type_details: [{ id_type_id: "CTZN" }],
              })),
            /*  100
              ), */
          },
        },

        account_info: {
          "ui:widget": "CustomRadioWidget",
          "ui:label": false,
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

        nid_verify: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonPopupWidget"
            : "hidden",
          "ui:label": false,
          "ui:classNames": "mt-3 w-100",
        },
        nid_reset: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonField"
            : "hidden",
          "ui:label": false,
          "ui:classNames": "mt-5 w-100",
          "ui:options": {
            disableButton: (formData) => !formData?.nid_verified,
            buttonClassName: "w-100",
            onClick: async (formData) => {
              this.dropdownReset({
                national_id_number: null,
                national_id_issue_date_ad: "",
                national_id_issue_date_bs: "",
                national_id_issue_place: "",
                nid_verified: "",
              });
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
          "ui:options": {
            onBlurCapture: (event) =>
              this.convertToArray(
                event?.target?.value,
                "family_member_full_name",
                "family_information"
              ),
          },
        },

        declared_anticipated_annual_transaction: {
          "ui:options": {
            addonBefore: "Customer",
          },
        },

        dedup_check: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:classNames":
            "d-flex justify-content-end align-items-end h-100 mt-5",
          "ui:options": {
            disableButton: (formData) =>
              !(
                formData?.first_name?.trim() &&
                formData?.last_name?.trim() &&
                formData?.father_name?.trim() &&
                formData?.date_of_birth_ad?.trim() &&
                formData?.dedup_identification?.trim() &&
                formData?.dedup_id_number?.trim()
              ),

            onClick: (formData) => {
              this.getDedupCheck(formData);
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
            getOptions: (formData) =>
              this.filterMasterData("scheme_type", formData),
          },
        },

        gender: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return (
                this.filterOptions("genders", formData?.salutation) ||
                this.filterOptions("genders")
              );
            },
          },
        },

        marital_status: {
          "ui:options": {
            onChange: (value) => {
              this.updateFamilyInformation(value);
            },
          },
        },

        cif_enquiry: {
          "ui:widget": "ButtonField",
          "ui:label": false,
          "ui:classNames": "d-flex h-100 mt-5 align-items-center",
          "ui:options": {
            disableButton: (formData) => !formData?.cif_number?.trim(),
            onClick: (formData) => {
              /*  setTimeout(
                  () => */
              setFormData({
                account_info: formData?.account_info,
                has_cif: formData?.has_cif,
                cif_number: formData?.cif_number,
                id_type_details: [{ id_type_id: "CTZN" }],
              });

              /*  100
                ), */
              this.fetchIndividualInfoCIFDetail(null);
            },
          },
        },

        last_name_not_available: {
          "ui:widget": "CustomCheckBoxWidget",

          "ui:label": false,

          "ui:options": {
            onChange: (value) => handleSetNotAvailable(value, "last_name"),
          },
        },

        last_name: {
          "ui:disabled": true,
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
              !this.moment(selectedDate).isBefore(
                this.moment().subtract(80, "years")
              ) &&
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
          "ui:widget": this.moment(this.formData?.date_of_birth_ad).isBefore(
            this.moment().subtract(80, "years")
          )
            ? "TextWidget"
            : widgets.NepaliDatePickerR,
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

        same_as_permanent: {
          "ui:widget": "CustomCheckBoxWidget",

          "ui:label": false,

          "ui:options": {
            onChange: sameAsPermanentOnChange,
          },
        },

        email_not_available: {
          "ui:widget": "CustomCheckBoxWidget",

          "ui:label": false,

          "ui:options": {
            onChange: (value) => handleSetNotAvailable(value, "email"),
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

        current_province: {
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

        nationality: {
          "ui:options": {
            onChange: async (value) => {
              this.dropdownReset({
                nationality: value,
                dedup_id_number: "",
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
        cif_data: {
          "ui:widget": "hidden",
        },
        source: {
          "ui:widget": "hidden",
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
                enforceAgeRestriction: true,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  const minDateValue = ["NRNCTZ"]?.includes(
                    formData?.id_type_details[index]?.id_type_id
                  )
                    ? this.moment(formData?.date_of_birth_ad).add(16, "years")
                    : this.moment(formData?.date_of_birth_ad);
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
                minimumDate: (formData, index) => {
                  const minDateValue = ["NRNCTZ"]?.includes(
                    formData?.id_type_details[index]?.id_type_id
                  )
                    ? this.moment(formData?.date_of_birth_bs)
                        .add(16, "years")
                        .format("YYYY-MM-DD")
                    : this.moment(formData?.date_of_birth_bs).format(
                        "YYYY-MM-DD"
                      );
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
                name: "id_expiry_date_ad",
                enforceAgeRestriction: false,
                validAge: 0,
                disableFutureDates: false,
                enableFutureDates: true,
                minimumDate: (formData, index) => {
                  return (
                    this.formData?.id_type_details?.[index]
                      ?.id_issued_date_ad &&
                    this.moment(
                      this.formData?.id_type_details?.[index]?.id_issued_date_ad
                    )
                  );
                },

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
                name: "id_expiry_date_bs",
                enforceAgeRestriction: true,
                validAge: 0,
                enableFutureDates: true,
                minimumDate: (formData, index) => {
                  return (
                    formData?.id_type_details?.[index]?.id_issued_date_bs &&
                    this.moment(
                      formData?.id_type_details?.[index]?.id_issued_date_bs
                    )
                  );
                },
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

        source_of_income: {
          "ui:options": {},
        },

        occupation_detail: {
          "ui:classNames": "my-1",
          "ui:options": {
            addable: false,

            orderable: false,

            removable: false,
          },

          items: {
            business_type: {},
          },
        },

        family_information: {
          "ui:widget": "EditableTableWidget",
          "ui:label": false,
          "ui:options": {
            addable: false,
            orderable: false,
            removable: false,
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

        screening_filter: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonField"
            : "hidden",
          "ui:label": false,
          "ui:options": {
            disableButton: (formData) => {
              let requiredFields = jsonSchema.required || [];

              const allFilled = requiredFields.every((field) => {
                const value = formData?.[field];

                return value !== undefined && value !== null && value !== "";
              });

              const isDedupCheck = !!formData?.dedup_module_data;

              const isTrue = !(allFilled && isDedupCheck);

              return this.form_status?.includes("init") && isTrue;
            },
            onClick: (event) => {
              setFormData((prevData) => {
                const currentValue = prevData?.screening_filter;

                function toggleFilter(value) {
                  if (value === undefined) return "true";
                  if (value === "true") return "false";
                  return "true";
                }

                return {
                  ...prevData,
                  screening_filter: toggleFilter(currentValue),
                };
              });
            },
          },
        },
        personal_info_screening: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:classNames": "my-5",
          "ui:options": {
            block: true,
            disableButton: (formData) => {
              let requiredFields = jsonSchema.required || [];

              const allFilled = requiredFields
                ?.filter(
                  (item) =>
                    item !== "personal_info_screening" && item !== "dedup_check"
                )
                .every((field) => {
                  const value = formData?.[field];

                  return value !== undefined && value !== null && value !== "";
                });

              const isDedupCheck = !!this.formData?.dedup_module_data;

              const isTrue = !(allFilled && isDedupCheck);

              return this.form_status?.includes("init") && isTrue;
            },

            onClick: () => {
              this.fetchPersonalInfoScreening();
            },
          },
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
        mode_of_operation: {
          "ui:widget": !this.form_status?.includes("case-init")
            ? "SelectWidget"
            : "hidden",
        },
        remarks: {
          "ui:widget": !this.form_status?.includes("case-init")
            ? "textarea"
            : "hidden",
          "ui:disabled": true,
          "ui:options": {
            rows: 5,
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
