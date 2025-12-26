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

      // Need to uncomment in LIVE
      // if (addHasUncheckedView) {
      //   errors?.personal_screening_data?.addError(
      //     "View all screening data to continue"
      //   );
      //   this.toast.error("View all screening data to continue");
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

      if (formData?.national_id_number == "999-999-999-9") {
        return errors;
      } else if (formData.nid_verified === "No") {
        errors.nid_verified.addError("NID must be verified.");
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
      if (this.functionGroup?.areObjectsEqual(formData, this.formData)) {
        this.setJsonSchema((prevJsonSchema) => {
          return {
            ...prevJsonSchema,
            isDisabled: true,
          };
        });
        setTimeout(() => {
          this.setFormData((prevFormData) => {
            return {
              ...prevFormData,
              dedup_module_data: null,
              branch_dedup_module_data: null,
              personal_screening_data: null,
            };
          });
        }, 100);
      }
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

    async updateSchemaWithEnums(
      fieldKey,

      optionsData,

      setJsonSchema,

      cascadeId = null
    ) {
      const fieldMapping = {
        account_type_id: "account_types",

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

        place_of_issue: "districts",

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
        literacy: "literacy",
        educational_qualification: "education_qualifications",
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
        this.setRenderFormKey((prevData) => {
          return prevData + 1;
        });
    }

    async initializeSchema(setJsonSchema, formData) {
      const fieldsToUpdate = [
        "account_type_id",
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
        "literacy",
        "educational_qualification",
        "place_of_issue",
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

    async getDedupCheck(formData) {
      const nonClearableField = [
        "first_name",
        "middle_name",
        "last_name",
        "last_name_not_available",
        "father_name",
        "dedup_id_number",
        "dedup_identification",
        "date_of_birth_ad",
        "date_of_birth_bs",
        "account_info",
        "account_type_id",
        "account_scheme_id",
        "currency",
        "nationality",
        "customer_status",
        "place_of_issue",
        "occupation_type",
        "current_country",
        "issuing_authority",
        "family_information",
      ];
      // !(formData?.has_cif || formData?.source === "ocr") &&
      //   this.formDataCleaner(nonClearableField, formData);

      if (!formData?.first_name) {
        this.toast.error("Enter name for dedup module");

        return;
      }

      this.addLoader("dedup_check", true);

      try {
        // Dedup check
        const dedupResponse = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check`,
          {
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            last_name: formData.last_name,
            father_name: formData.father_name,
            id_number: formData.dedup_id_number,
            document_type: formData.dedup_identification,
            citizenship_number: null,
            place_of_issue: formData.place_of_issue,
            dob_ad: formData.date_of_birth_ad,
            dob_bs: formData.date_of_birth_bs,
          }
        );

        if (dedupResponse) {
          this.toast.success(dedupResponse?.data?.data?.dedup_message);
          this.setFormData((prevData) => ({
            ...prevData,
            dedup_module_data: dedupResponse?.data?.data?.data?.dedup_record,
            branch_dedup_module_data:
              dedupResponse?.data?.data?.data?.branch_dedup_record,
          }));
        }

        // Screening check
        const screeningResponse = await this.axios.post(
          `${this.mainRouteURL}/external-api/screening-check`,
          {
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            last_name: formData.last_name,
            citizenship_no: formData.dedup_id_number,
            dob_ad: formData.date_of_birth_ad,
          }
        );

        const responseData = screeningResponse?.data?.data;
        const cleanedResponseData = Object.fromEntries(
          Object.entries(responseData).filter(
            ([key, value]) => !(Array.isArray(value) && value.length === 0)
          )
        );

        delete cleanedResponseData.screening_id;

        this.setFormData((prev) => ({
          ...prev,
          personal_screening_data: cleanedResponseData || [],
          screening_ref_code: String(responseData?.screening_id),
        }));

        this.setJsonSchema((prev) => ({ ...prev, isDisabled: false }));
      } catch (error) {
        const errMsg =
          error?.response?.data?.message ||
          error?.response?.statusText ||
          "An unexpected error occurred.";

        this.setModalOpen({
          open: true,
          message: errMsg,
          subTitle: Array.isArray(error?.response?.data?.errors)
            ? error?.response?.data?.errors.join("\n")
            : "",
          status: "error",
          close: "Close",
        });
      } finally {
        this.addLoader("dedup_check", false);
        this.buttonLoader = false;
        this.setRenderFormKey((prev) => prev + 1);
      }
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
          "account_info",

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
          "current_country",
          "dedup_identification",
          "issuing_authority",
          "place_of_issue",
          "dedup_id_number",

          "extra_gap",
          "dedup_check",
          "dedup_module_data",
          "branch_dedup_module_data",
          "personal_screening_data",
          "screening_ref_code",
        ],
        connectedPairs: [
          ["last_name", "last_name_not_available"],
          ["email", "email_not_available"],
        ],

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
                  value: item?.fg_code || item?.cbs_code || item?.id,
                }));
            },
          },
        },

        first_name: {
          "ui:options": {
            maxLength: 30,
          },
        },
        middle_name: {
          "ui:options": {
            maxLength: 30,
          },
        },
        last_name: {
          "ui:options": {
            maxLength: 30,
          },
        },
        last_name_not_available: {
          "ui:widget": "CustomCheckBoxWidget",

          "ui:label": false,

          "ui:options": {
            onChange: (value) => handleSetNotAvailable(value, "last_name"),
          },
        },

        father_name: {
          "ui:options": {
            maxLength: 50,
          },
        },

        date_of_birth_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Date of Birth (A.D)",
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            name: "date_of_birth_ad",
            enforceAgeRestriction: true,
            disableFutureDates: true,
            minAge: 18,
            validAge: 0,
            onDateChange: (selectedDate) => {
              if (
                !this.moment(selectedDate).isBefore(
                  this.moment().subtract(80, "years")
                )
              ) {
                this.convertDate(
                  selectedDate,
                  setFormData,
                  true,
                  "date_of_birth_ad"
                );
                this.setUiSchema((prevUiSchema) => {
                  return {
                    ...prevUiSchema,
                    date_of_birth_bs: {
                      ...prevUiSchema?.date_of_birth_bs,
                      "ui:widget": widgets.NepaliDatePickerR,
                    },
                  };
                });
              } else {
                setTimeout(() => {
                  this.setFormData((prev) => ({
                    ...prev,
                    date_of_birth_bs: undefined,
                  }));
                }, 100);
              }
              if (
                this.functionGroup?.areObjectsEqual(formData, this.formData)
              ) {
                this.setJsonSchema((prevJsonSchema) => {
                  return {
                    ...prevJsonSchema,
                    isDisabled: true,
                  };
                });
                setTimeout(() => {
                  this.setFormData((prevFormData) => {
                    return {
                      ...prevFormData,
                      dedup_module_data: null,
                      branch_dedup_module_data: null,
                      personal_screening_data: null,
                    };
                  });
                }, 100);
                this.setRenderFormKey((prevData) => {
                  return prevData + 1;
                });
              }
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
            name: "date_of_birth_bs",
            enforceAgeRestriction: true,
            disableFutureDates: true,
            validAge: 0,
            maxAge: 18,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "date_of_birth_bs"
              );
              if (
                this.functionGroup?.areObjectsEqual(formData, this.formData)
              ) {
                this.setJsonSchema((prevJsonSchema) => {
                  return {
                    ...prevJsonSchema,
                    isDisabled: true,
                  };
                });
                setTimeout(() => {
                  this.setFormData((prevFormData) => {
                    return {
                      ...prevFormData,
                      dedup_module_data: null,
                      branch_dedup_module_data: null,
                      personal_screening_data: null,
                    };
                  });
                }, 100);
                this.setRenderFormKey((prevData) => {
                  return prevData + 1;
                });
              }
            },
          },
        },

        is_nrn: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                is_nrn: value,
                dedup_identification: value === "Yes" ? "NRN" : null,
                issuing_authority: value === "Yes" ? "MOEXA" : null,
                place_of_issue: null,
                dedup_id_number: "",
              });
            },
          },
        },

        is_refugee: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                is_refugee: value,
                dedup_identification: value === "Yes" ? "REF" : null,
                issuing_authority: value === "Yes" ? "NUCRA" : null,
                place_of_issue: null,
                dedup_id_number: "",
              });
            },
          },
        },

        nationality: {
          "ui:options": {
            onChange: async (value) => {
              this.dropdownReset({
                nationality: value,
                current_country: value === "NP" ? "NP" : null,
                dedup_identification: this.formData?.is_nrn?.includes("Yes")
                  ? this.formData?.dedup_identification
                  : this.formData?.is_refugee?.includes("Yes")
                  ? this.formData?.dedup_identification
                  : null,
                issuing_authority: this.formData?.is_nrn?.includes("Yes")
                  ? this.formData?.issuing_authority
                  : this.formData?.is_refugee?.includes("Yes")
                  ? this.formData?.issuing_authority
                  : null,
                place_of_issue: value === "NP" ? null : "FORCT",
                dedup_id_number: "",
              });
            },
          },
        },

        current_country: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                current_country: value,
                dedup_identification: this.formData?.is_nrn?.includes("Yes")
                  ? this.formData?.dedup_identification
                  : this.formData?.is_refugee?.includes("Yes")
                  ? this.formData?.dedup_identification
                  : null,
                issuing_authority: this.formData?.is_nrn?.includes("Yes")
                  ? this.formData?.issuing_authority
                  : this.formData?.is_refugee?.includes("Yes")
                  ? this.formData?.issuing_authority
                  : null,
                place_of_issue: value === "NP" ? null : "FORCT",
                dedup_id_number: "",
              });
            },
          },
        },

        dedup_identification: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData, index) => {
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
                          formData?.nationality || this.formData?.nationality,
                        account_type:
                          formData?.account_info || this.formData?.account_info,
                        ...((formData?.nationality ||
                          this.formData?.nationality) === "NP" && {
                          current_country:
                            formData?.current_country ||
                            this.formData?.current_country,
                        }),
                      }
                    );

              return filterOption || [];
            },
            onChange: (value) => {
              this.dropdownReset({
                dedup_identification: value,
                issuing_authority: defaultSelectedValue(value)?.[0]?.value,
                place_of_issue:
                  this.formData?.nationality === "NP" ? null : "FORCT",
                dedup_id_number: "",
              });
            },
          },
        },
        issuing_authority: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            setDisabled: (formData, index) => {
              return (formData?.nationality === "IN" &&
                formData?.dedup_identification === "DL") ||
                (formData?.nationality !== "IN" &&
                  formData?.dedup_identification === "DL")
                ? true
                : defaultSelectedValue(
                    formData?.dedup_identification ||
                      this.formData?.dedup_identification
                  )?.length === 1
                ? true
                : false;
            },
            getOptions: (formData, index) => {
              return defaultSelectedValue(
                formData?.dedup_identification ||
                  this.formData?.dedup_identification
              );
            },
            onChange: (value) => {
              this.dropdownReset({
                issuing_authority: value,
                place_of_issue:
                  this.formData?.nationality === "NP" ? null : "FORCT",
                dedup_id_number: "",
              });
            },
          },
        },

        dedup_id_number: {
          "ui:options": {
            onBlurCapture: (event) =>
              this.convertToArray(
                event?.target?.value,
                "identification_number",
                "id_type_details",
                ["dedup_identification", "id_type_id"]
              ),
            maxLength: 30,
          },
        },

        dedup_check: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonField"
            : "hidden",
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

        dedup_module_data: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
          showCheckbox: false,
          showViewedColumn: false,
          // showActionText: true,
          fixedActionsColumn: true,
          "ui:options": {
            onCheckboxChange: (tableData, category, checked) => {
              this.setFormData((prevData) => ({
                ...prevData,
                [category]: checked ? "Yes" : "No",
                dedup_module_data: tableData,
              }));
            },
            disabledButton: (this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("reporting") ||
              this.form_status?.includes("Completed")) && ["match"],
            actionHandlers: {
              ...(!(
                this.form_status?.includes("review") ||
                this.form_status?.includes("approval") ||
                this.form_status?.includes("reporting") ||
                this.form_status?.includes("Completed")
              ) && {
                view: (record) => setIsModalVisible(true),
              }),
            },
          },
        },
        branch_dedup_module_data: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
          showCheckbox: false,
          showViewedColumn: false,
          // showActionText: true,
          fixedActionsColumn: true,
          "ui:options": {
            onCheckboxChange: (tableData, category, checked) => {
              this.setFormData((prevData) => ({
                ...prevData,
                [category]: checked ? "Yes" : "No",
                branch_dedup_module_data: tableData,
              }));
            },
            disabledButton: (this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("reporting") ||
              this.form_status?.includes("Completed")) && ["match"],
            actionHandlers: {
              ...(!(
                this.form_status?.includes("review") ||
                this.form_status?.includes("approval") ||
                this.form_status?.includes("reporting") ||
                this.form_status?.includes("Completed")
              ) && {
                view: (record) => setIsModalVisible(true),
              }),
            },
          },
        },

        personal_screening_data: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
          showCheckbox: true,
          showViewedColumn: false,
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

        screening_ref_code: {
          "ui:widget": "hidden",
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
