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
      this.setModalOpen = options.setModalOpen;

      this.setUiSchema = options.setUiSchema;
      this.adToBs = options.adToBs;
      this.bsToAd = options.bsToAd;
      this.masterDataUrl = masterDataUrl;
      this.isMasterDataLoaded = false;
      this.setNextStep = options.setNextStep;
      this.setDivide = options.setDivide;
      this.schemaConditions = options.schemaConditions;
      this.moment = options.moment;
      this.NepaliDate = options.NepaliDate;
      this.functionGroup = options.functionGroup;
      this.case_id = options.case_id;
      this.nationalityChanged = false;
    }

    customValidate(formData, errors, uiSchema) {
      const hasUncheckedView = Object.keys(
        formData?.guardian_personal_screening_data || {}
      ).map((key) => {
        const items = formData.guardian_personal_screening_data[key];
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
      //   errors?.guardian_personal_screening_data?.addError(
      //     "View all Screening Data To Continue"
      //   );
      //   this.toast.error("View all Screening Data To Continue");
      // }

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

    // FUNCTION TO ADD PREFIX TO THE RESPONSE
    addPrefixToKeys(obj, prefix) {
      if (typeof obj !== "object" || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map((item) => this.addPrefixToKeys(item, prefix));
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
          if (key === "id_type_details" && Array.isArray(value)) {
            // Keep the key as is and skip prefixing the array value
            return [prefix + key, value];
          }

          return [prefix + key, this.addPrefixToKeys(value, prefix)];
        })
      );
    }

    // FUNCTION TO FILTER OPTIONS AS PER CASCADE
    filterOptions(key, cascadeValue) {
      if (!this.optionsData[key]) return [];

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

    dropdownReset = async (dropdownClearObject, arrayName, index) => {
      setTimeout(() => {
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

    async calculateRisk(value) {
      try {
        this.addLoader("guardian_calculate_risk", true);
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...this.formData,
            category: "individual",
            guardian_risk_check: true,
            id: this.case_id,
          }
        );

        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data;

        this.setFormData((prevData) => ({
          ...prevData,
          guardian_risk_level: resp?.risk_level,
          guardian_risk_score: resp?.risk_score,
        }));
        this.setJsonSchema((prevJsonSchema) => {
          return {
            ...prevJsonSchema,
            isDisabled: false,
          };
        });

        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        this.toast.error(error?.response?.data?.message);
        return {};
      } finally {
        this.addLoader("guardian_calculate_risk", false);
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
            if (Object.keys(item).length === 0)
              return {
                [comparisionKey[1]]: prevData[comparisionKey[0]],
                [key]: value,
              };

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
      }, 200);
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
        guardian_date_of_birth_ad: [
          "guardian_date_of_birth_ad",
          "guardian_date_of_birth_bs",
        ],
        guardian_date_of_birth_bs: [
          "guardian_date_of_birth_ad",
          "guardian_date_of_birth_bs",
        ],
        id_issued_date_ad: ["id_issued_date_ad", "id_issued_date_bs"],
        id_issued_date_bs: ["id_issued_date_ad", "id_issued_date_bs"],
        id_expiry_date_ad: ["id_expiry_date_ad", "id_expiry_date_bs"],
        id_expiry_date_bs: ["id_expiry_date_ad", "id_expiry_date_bs"],
        guardian_national_id_issue_date_ad: [
          "guardian_national_id_issue_date_ad",
          "guardian_national_id_issue_date_bs",
        ],
        guardian_national_id_issue_date_bs: [
          "guardian_national_id_issue_date_ad",
          "guardian_national_id_issue_date_bs",
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
        account_type_id: "account_types",
        guardian_business_type: "business_type",
        guardian_nationality: "nationalities",
        guardian_permanent_province: "provinces",
        guardian_permanent_district: "districts",
        guardian_permanent_municipality: "local_bodies",
        guardian_current_country: "countries",
        guardian_dedup_current_country: "countries",
        guardian_current_province: "provinces",
        guardian_current_district: "districts",
        guardian_current_municipality: "local_bodies",
        id_type_id: "document_types",
        issue_country: "countries",
        issued_district_text: "countries",
        issued_district: "districts",
        issuing_authority: "issuing_authorities",
        guardian_family_member_relation: "relationships",
        guardian_occupation_type: "occupations",
        guardian_source_of_income: "income_sources",
        guardian_employment_type: "employment_statuses",
        guardian_permanent_country: "countries",
        relation_to_nominee: "relationships",
        account_scheme_id: "scheme_type",
        guardian_salutation: "salutations",
        guardian_existing_risk_rating: "risk_categories",
        guardian_gender: "genders",
        guardian_marital_status: "marital_status",
        account_info: "account_category",
        guardian_mobile_country_code: "country_codes",
        guardian_phone_country_code: "country_codes",
        guardian_dedup_identification: "document_types",
        guardian_designation: "corporate_relation",
        guardian_customer_type_id: "customer_types",
        guardian_constitution_code_id: "constitution_types",
        guardian_national_id_issuing_authority: "issuing_authorities",
        guardian_national_id_issue_place: "districts",
        guardian_related_party_relation_with_account_holder: "relationships",
        guardian_place_of_issue: "districts",
        guardian_literacy: "literacy",
        guardian_educational_qualification: "education_qualifications",
        guardian_hpp_category: "hpp_categories",
        guardian_hpp_sub_category: "hpp_sub_categories",
      };
      const dataKey = fieldMapping[fieldKey] || fieldKey;
      let fieldOptions = optionsData[dataKey] || [];

      if (cascadeId !== null) {
        const validCascadeIds = Array.isArray(cascadeId)
          ? cascadeId
          : [cascadeId];

        // Filter gender options where at least one cascade_id matches guardian_salutation ID
        fieldOptions = fieldOptions?.filter((option) => {
          if (!option.cascade_id) return false;
          const cascadeArray = Array.isArray(option.cascade_id)
            ? option.cascade_id
            : [option.cascade_id];

          return cascadeArray.some((id) => validCascadeIds.includes(id));
        });
      }

      const enumValues = Array.from(
        new Set(
          fieldOptions?.map((item) =>
            String(item?.fg_code || item?.cbs_code || item?.id)
          )
        )
      );

      const enumNames = fieldOptions?.map((option) => option.title);

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
      this.setFormData((prevFormData) => {
        const updatedFamilyDetails = [...prevFormData[arrayPath]];
        updatedFamilyDetails[index] = {
          ...updatedFamilyDetails[index],
          guardian_is_family_name_not_available: value,
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
        this.setRenderFormKey((prevData) => {
          return prevData + 1;
        });
    }

    async initializeSchema(setJsonSchema, formData) {
      if (!this.form_status?.includes("case-init")) this.setDivide(true);
      if (this.formData?.account_info === "MINOR") {
        this.setNextStep("minor-cdd-form");
      } else {
        this.setNextStep("joint-cdd-forma");
      }

      if (this.form_status?.includes("review")) {
        this.setJsonSchema((prevSchema) => {
          const updatedSchema = { ...prevSchema };
          updatedSchema.isDisabled = false;
          updatedSchema.hasStep =
            updatedSchema?.guardian_risk_level === "High Risk";
          return updatedSchema;
        });
      }

      const fieldsToUpdate = [
        "account_type_id",
        "guardian_nationality",
        "joint_nationality",
        "guardian_permanent_province",
        "guardian_family_member_relation",
        "guardian_permanent_district",
        "guardian_permanent_municipality",
        "guardian_current_country",
        "guardian_dedup_current_country",
        "guardian_current_province",
        "guardian_current_district",
        "guardian_current_municipality",
        "id_type_id",
        "issue_country",
        "issued_district",
        "issuing_authority",
        "guardian_mobile_country_code",
        "guardian_phone_country_code",
        "guardian_occupation_type",
        "guardian_source_of_income",
        "guardian_employment_type",
        "guardian_permanent_country",
        "account_scheme_id",
        "guardian_business_type",
        "guardian_gender",
        "guardian_salutation",
        "guardian_marital_status",
        "guardian_existing_risk_rating",
        "account_info",
        "guardian_dedup_identification",
        "issued_district_text",
        "guardian_related_party_relation_with_account_holder",
        "guardian_designation",
        "guardian_customer_type_id",
        "guardian_constitution_code_id",
        "guardian_national_id_issuing_authority",
        "guardian_national_id_issue_place",
        "guardian_place_of_issue",
        "guardian_literacy",
        "guardian_educational_qualification",
        "guardian_hpp_category",
        "guardian_hpp_sub_category",
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

    async fetchIndividualInfoCIFDetail(cifId) {
      this.setUiSchema((prevUiSchema) => ({
        ...prevUiSchema,
        guardian_cif_enquiry: {
          ...prevUiSchema.guardian_cif_enquiry,
          "ui:disabled": true,
          "ui:options": {
            ...prevUiSchema.guardian_cif_enquiry["ui:options"],
            show_loader: true,
          },
        },
      }));
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number: cifId ?? this.formData.guardian_cif_number,
            id: this.case_id,
            form_title: "guardian_info",
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data;
        const prefixAddedData = this.addPrefixToKeys(resp, "guardian_");
        this.setFormData((prevData) => ({
          ...prefixAddedData,
          account_info: prevData?.account_info,
          guardian_has_cif: prevData?.guardian_has_cif,
          guardian_cif_number: prevData?.guardian_cif_number,
          ...(resp?.national_id_number && {
            guardian_national_id_number: this.functionGroup.nidFormat(
              resp?.national_id_number
            ),
          }),
          guardian_date_of_birth_bs: resp?.date_of_birth_ad
            ? this.adToBs(resp?.date_of_birth_ad)
            : "",
          guardian_guardian_cif_data: JSON.stringify(prefixAddedData),
        }));
        return;
      } catch (error) {
        this.setModalOpen({
          open: true,
          message: error
            ? `${error.response?.data?.message || error?.response?.statusText}`
            : `${error || "Unknown Error"}`,
          subTitle: Array.isArray(error?.response?.data?.errors)
            ? error?.response?.data?.errors
                .map((e) => `${typeof e === "string" ? e : JSON.stringify(e)}`)
                .join("\n")
            : "",

          status: "error",
          close: "Close",
        });

        return {};
      } finally {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          guardian_cif_enquiry: {
            ...prevUiSchema.guardian_cif_enquiry,
            "ui:disabled": false,
            "ui:options": {
              ...prevUiSchema.guardian_cif_enquiry["ui:options"],
              show_loader: false,
            },
          },
        }));
      }
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
        "guardian_family_information" in this.formData &&
        Array.isArray(this.formData.guardian_family_information) &&
        this.formData.guardian_family_information.length > 0
      ) {
        const cleanedFamilyInfo = this.formData.guardian_family_information.map(
          (item, index) => {
            if (index === 0) return item;
            const cleaned = { ...item };
            delete cleaned.guardian_family_member_full_name;
            delete cleaned.guardian_is_family_name_not_available;
            return cleaned;
          }
        );
        result.guardian_family_information = cleanedFamilyInfo;
      }

      const validId = "WPERM";

      if (
        "guardian_id_type_details" in this.formData &&
        Array.isArray(this.formData.guardian_id_type_details) &&
        this.formData.guardian_id_type_details.length > 0
      ) {
        const [firstItem, ...restItems] =
          this.formData.guardian_id_type_details;

        // Filter remaining items for valid id_type_id
        const matchingItems = restItems.filter(
          (item) => item?.id_type_id === validId
        );

        // Always include the first item, plus any valid matches from the rest
        result.guardian_id_type_details =
          this.formData.guardian_id_type_details?.map((item, index) => ({
            id_type_id: item?.id_type_id,
            identification_number: index === 0 && item?.identification_number,
            ...(item?.removable === false && { removable: item?.removable }),
          }));
      }

      setTimeout(() => this.setFormData(result), 100);
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

      if (!formData?.guardian_first_name) {
        this.toast.error("Enter name for dedup module");

        return;
      }

      this.addLoader("guardian_dedup_check", true);

      try {
        // Screening check
        const screeningResponse = await this.axios.post(
          `${this.mainRouteURL}/external-api/screening-check`,
          {
            first_name: formData.guardian_first_name,
            middle_name: formData.guardian_middle_name,
            last_name: formData.guardian_last_name,
            citizenship_no: formData.guardian_dedup_identification,
            dob_ad: formData.guardian_date_of_birth_ad,
          }
        );

        const responseData = screeningResponse?.data?.data;
        const cleanedResponseData = Object.fromEntries(
          Object.entries(responseData).filter(
            ([key, value]) => !(Array.isArray(value) && value.length === 0)
          )
        );

        delete cleanedResponseData.screening_id;

        if (responseData) {
          this.toast.success("Preliminary Screening Success");
          this.setFormData((prev) => ({
            ...prev,
            guardian_personal_screening_data: cleanedResponseData || [],
            guardian_screening_ref_code: String(responseData?.screening_id),
          }));
        }
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
        this.addLoader("guardian_dedup_check", false);
        this.buttonLoader = false;
        this.setRenderFormKey((prev) => prev + 1);
      }
    }

    async updateFamilyInformation(value) {
      const { guardian_family_information = [] } = this.formData;

      const MARRIED_STATUS_ID = "MARRD";
      const SPOUSE_RELATION_ID = "SPOUS";

      const updatedFamilyInfo = Array.isArray(guardian_family_information)
        ? [...guardian_family_information]
        : [];

      if (value === MARRIED_STATUS_ID) {
        const spouseExists = updatedFamilyInfo.some(
          (member) =>
            member.guardian_family_member_relation?.toLowerCase().trim() ===
            SPOUSE_RELATION_ID.toLowerCase()
        );

        if (!spouseExists) {
          updatedFamilyInfo.push({
            guardian_family_member_relation: SPOUSE_RELATION_ID,
            guardian_family_member_full_name: "", // Placeholder
          });

          this.setUiSchema((prevSchema) => {
            const updatedUiSchema = {
              ...prevSchema,
              guardian_family_information: {
                ...prevSchema.guardian_family_information,
                "ui:options": {
                  ...prevSchema?.guardian_family_information["ui:options"],
                  disableSpecificKeys: this.form_status.includes("init")
                    ? [
                        { guardian_family_member_relation: 0 },
                        { guardian_family_member_relation: 1 },
                        { guardian_family_member_relation: 2 },
                        { guardian_family_member_relation: 3 },
                      ]
                    : [
                        {
                          guardian_family_member_relation: 0,
                          guardian_family_member_full_name: 0,
                          guardian_is_family_name_not_available: 0,
                        },

                        {
                          guardian_family_member_relation: 1,
                          guardian_family_member_full_name: 1,
                          guardian_is_family_name_not_available: 1,
                        },

                        {
                          guardian_family_member_relation: 2,
                          guardian_family_member_full_name: 2,
                          guardian_is_family_name_not_available: 2,
                        },
                        {
                          guardian_family_member_relation: 3,
                          guardian_family_member_full_name: 3,
                          guardian_is_family_name_not_available: 3,
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
              guardian_family_information: {
                ...prevSchema.guardian_family_information,
                "ui:options": {
                  ...prevSchema?.guardian_family_information["ui:options"],
                  disableSpecificKeys: this.form_status.includes("init")
                    ? [
                        { guardian_family_member_relation: 0 },
                        { guardian_family_member_relation: 1 },
                        { guardian_family_member_relation: 2 },
                        { guardian_family_member_relation: 3 },
                      ]
                    : [
                        {
                          guardian_family_member_relation: 0,
                          guardian_family_member_full_name: 0,
                          guardian_is_family_name_not_available: 0,
                        },

                        {
                          guardian_family_member_relation: 1,
                          guardian_family_member_full_name: 1,
                          guardian_is_family_name_not_available: 1,
                        },

                        {
                          guardian_family_member_relation: 2,
                          guardian_family_member_full_name: 2,
                          guardian_is_family_name_not_available: 2,
                        },
                        {
                          guardian_family_member_relation: 3,
                          guardian_family_member_full_name: 3,
                          guardian_is_family_name_not_available: 3,
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
            guardian_family_information: {
              ...prevSchema.guardian_family_information,
              "ui:options": {
                ...prevSchema?.guardian_family_information["ui:options"],
                disableSpecificKeys: this.form_status.includes("init")
                  ? [
                      { guardian_family_member_relation: 0 },
                      { guardian_family_member_relation: 1 },
                      { guardian_family_member_relation: 2 },
                    ]
                  : [
                      {
                        guardian_family_member_relation: 0,
                        guardian_family_member_full_name: 0,
                        guardian_is_family_name_not_available: 0,
                      },

                      {
                        guardian_family_member_relation: 1,
                        guardian_family_member_full_name: 1,
                        guardian_is_family_name_not_available: 1,
                      },

                      {
                        guardian_family_member_relation: 2,
                        guardian_family_member_full_name: 2,
                        guardian_is_family_name_not_available: 2,
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
          guardian_family_information: updatedFamilyInfo,
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
        widgets,
        jsonSchema,
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
          "guardian_has_cif",
          "guardian_cif_number",
          "guardian_cif_enquiry",

          "guardian_first_name",
          "guardian_middle_name",
          "guardian_last_name",
          "guardian_last_name_not_available",
          "guardian_father_name",
          "guardian_grandfather_name",
          "guardian_date_of_birth_ad",
          "guardian_date_of_birth_bs",
          "guardian_dedup_identification",
          "guardian_dedup_id_number",
          "guardian_existing_permanent_address",
          "guardian_related_party_family_account_holder",
          "guardian_related_party_relation_with_account_holder",

          "guardian_dedup_check",
          "guardian_personal_screening_data",
          "guardian_screening_ref_code",

          "guardian_hpp",
          "guardian_hpp_category",
          "guardian_hpp_sub_category",
          "guardian_pep",
          "guardian_pep_category",
          "guardian_pep_declaration",
          "guardian_family_pep_declaration",
          "guardian_adverse_media",
          "guardian_adverse_category",
          "guardian_loan_status",
          "guardian_is_blacklisted",
          "guardian_customer_introduce_by",
          "guardian_employee_id",
          "guardian_introducer_account_number",
          "guardian_met_in_person",

          "guardian_risk_level",
          "guardian_calculate_risk",

          "guardian_cif_data",
          "account_info",
          "is_minor_account",
        ],
        connectedPairs: [
          ["guardian_last_name", "guardian_last_name_not_available"],
          ["guardian_email", "guardian_email_not_available"],
        ],
        guardian_has_cif: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) =>
              !value &&
              setTimeout(
                () =>
                  setFormData((prev) => ({
                    account_info: prev?.account_info,
                  })),
                100
              ),
          },
        },
        guardian_first_name: {
          "ui:options": {
            maxLength: 30,
          },
        },
        guardian_middle_name: {
          "ui:options": {
            maxLength: 30,
          },
        },
        guardian_last_name: {
          "ui:options": {
            maxLength: 30,
          },
        },

        guardian_father_name: {
          "ui:options": {
            maxLength: 50,
          },
        },
        guardian_grandfather_name: {
          "ui:options": {
            maxLength: 50,
          },
        },

        account_info: {
          "ui:widget": "hidden",
        },
        is_minor_account: {
          "ui:widget": "hidden",
        },
        guardian_screening_ref_code: {
          "ui:widget": "hidden",
        },
        guardian_cif_data: {
          "ui:widget": "hidden",
        },

        guardian_dedup_identification: {
          // "ui:widget": "CascadeDropdown",
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                guardian_dedup_identification: value,
                guardian_dedup_id_number: "",
              });
            },
          },
        },

        guardian_related_party_relation_with_account_holder: {},

        guardian_cif_enquiry: {
          "ui:widget": "ButtonField",
          "ui:label": false,
          "ui:classNames": "d-flex h-100 mt-5 align-items-center",
          "ui:options": {
            disableButton: (formData) => !formData?.guardian_cif_number?.trim(),
            onClick: (formData) => {
              setTimeout(
                () =>
                  setFormData({
                    account_info: formData?.account_info,
                    guardian_has_cif: formData?.guardian_has_cif,
                    guardian_cif_number: formData?.guardian_cif_number,
                  }),
                100
              ),
                this.fetchIndividualInfoCIFDetail(null);
            },
          },
        },

        guardian_last_name_not_available: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) =>
              handleSetNotAvailable(value, "guardian_last_name"),
          },
        },

        guardian_date_of_birth_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Date of Birth (A.D)",
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            name: "guardian_date_of_birth_ad",
            enforceAgeRestriction: true,
            validAge: 18,
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
                  "guardian_date_of_birth_ad"
                );
                this.setUiSchema((prevUiSchema) => {
                  return {
                    ...prevUiSchema,
                    guardian_date_of_birth_bs: {
                      ...prevUiSchema?.guardian_date_of_birth_bs,
                      "ui:widget": widgets.NepaliDatePickerR,
                    },
                  };
                });
              } else {
                setTimeout(() => {
                  this.setFormData((prev) => ({
                    ...prev,
                    guardian_date_of_birth_bs: undefined,
                  }));
                  this.setUiSchema((prevUiSchema) => {
                    return {
                      ...prevUiSchema,
                      guardian_date_of_birth_bs: {
                        ...prevUiSchema?.guardian_date_of_birth_bs,
                        "ui:widget": "TextWidget",
                      },
                    };
                  });
                }, 100);
              }
            },
          },
        },
        guardian_date_of_birth_bs: {
          "ui:widget": this.moment(
            this.formData?.guardian_date_of_birth_ad
          ).isBefore(this.moment().subtract(80, "years"))
            ? "TextWidget"
            : widgets.NepaliDatePickerR,
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            enforceAgeRestriction: true,
            name: "guardian_date_of_birth_bs",
            validAge: 18,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "guardian_date_of_birth_bs"
              );
            },
          },
        },

        guardian_dedup_check: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonField"
            : "hidden",
          "ui:label": false,
          "ui:classNames":
            "d-flex justify-content-end align-items-end h-100 my-1",
          "ui:options": {
            disableButton: (formData) =>
              !(
                formData?.guardian_first_name?.trim() &&
                formData?.guardian_last_name?.trim() &&
                formData?.guardian_father_name?.trim() &&
                formData?.guardian_dedup_id_number?.trim() &&
                formData?.guardian_date_of_birth_ad?.trim() &&
                formData?.guardian_date_of_birth_bs?.trim()
              ),
            onClick: (formData) => {
              this.getDedupCheck(formData);
            },
          },
        },

        guardian_personal_screening_data: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
          showCheckbox: true,
          showActionText: true,
          fixedActionsColumn: true,
          showViewedColumn: false,
          showFooter: true,
          "ui:options": {
            onCheckboxChange: (tableData, category, checked) => {
              const categoryKey =
                category === "pep_nba"
                  ? "guardian_pep"
                  : category === "sanction_moha"
                  ? "guardian_sanction"
                  : category;

              // check if any item in the array has isChecked true
              const hasChecked = tableData[categoryKey]?.some(
                (item) => item.isChecked
              );
              this.setFormData((prevData) => ({
                ...prevData,
                [categoryKey]: hasChecked ? "Yes" : "No",
                guardian_personal_screening_data: tableData,
              }));
            },
            actionHandlers: {
              view: (record) => setIsModalVisible(true),
            },
          },
        },

        guardian_current_country: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                guardian_current_country: value,
                guardian_current_province: null,
                guardian_current_district: null,
                guardian_current_municipality: null,
              });
            },
          },
        },

        guardian_current_province: {
          "ui:options": {
            onChange: (value) =>
              this.dropdownReset({
                guardian_current_province: value,
                guardian_current_district: null,
                guardian_current_municipality: null,
                guardian_current_house_number: "",
                guardian_current_ward_number: "",
                guardian_current_town: "",
                guardian_current_street_name: "",
                guardian_current_outside_town: "",
                guardian_current_outside_street_name: "",
              }),
          },
        },
        guardian_current_district: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "districts",
                formData?.guardian_current_province
              );
            },
            onChange: (value) =>
              this.dropdownReset({
                guardian_current_district: value,
                guardian_current_municipality: null,
                guardian_current_house_number: "",
                guardian_current_ward_number: "",
                guardian_current_town: "",
                guardian_current_street_name: "",
                guardian_current_outside_town: "",
                guardian_current_outside_street_name: "",
              }),
          },
        },
        guardian_current_municipality: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "local_bodies",
                formData?.guardian_current_district
              );
            },
          },
        },

        guardian_screening_card: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
        },
        guardian_risk_level: {},
        guardian_risk_score: {
          "ui:widget": "hidden",
        },

        guardian_calculate_risk: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonField"
            : "hidden",
          "ui:label": false,
          "ui:classNames":
            "d-flex flex-column justify-content-center mt-5 h-100",
          "ui:options": {
            disableButton: (formData) => {
              let requiredFields = jsonSchema.required || [];
              const allFilled = requiredFields.every((field) => {
                const value = formData?.[field];
                return value !== undefined && value !== null && value !== "";
              });

              return this.form_status?.includes("init") && !allFilled;
            },
            onClick: (value) => {
              this.calculateRisk(value);
            },
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
