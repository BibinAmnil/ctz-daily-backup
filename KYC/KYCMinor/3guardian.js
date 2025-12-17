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
        formData.guardian_phone_number &&
        !isValidPhoneNumber(formData.guardian_phone_number)
      ) {
        errors.phone_number.addError("Phone number must be 7 to 12 digits.");
      }

      if (
        formData?.guardian_mobile_number &&
        formData?.guardian_mobile_country_code
      ) {
        if (
          formData?.guardian_mobile_number !== undefined &&
          !isValidMobileNumber(
            formData.guardian_mobile_number,
            formData.guardian_mobile_country_code
          )
        ) {
          if (formData.guardian_mobile_country_code === "NEPAL") {
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

    lookupValue(value, key) {
      if (!this.optionsData[value]) return null;
      const foundItem = this.optionsData[value].find(
        (item) => item.cbs_code === key || item.title === key
      );
      if (!foundItem) return null;
      return founditem?.fg_code || item?.cbs_code || item?.id;
    }

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

    async fetchMasterData(url, axios) {
      try {
        const response = await axios.get(url);
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const data = response?.data;

        this.isMasterDataLoaded = true;
        this.optionsData = data.data;

        return data.data;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
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
      this.setNextStep("personal-cdd-form");

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
          guardian_cif_data: JSON.stringify(prefixAddedData),
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
      // !(formData?.has_cif || formData?.source === "ocr") &&
      //   this.formDataCleaner(nonClearableField, formData);

      if (!formData?.guardian_first_name) {
        this.toast.error("Enter name for dedup module");

        return;
      }

      this.addLoader("guardian_dedup_check", true);

      try {
        // Dedup check
        const dedupResponse = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check`,
          {
            first_name: formData.guardian_first_name,
            middle_name: formData.guardian_middle_name,
            last_name: formData.guardian_last_name,
            father_name: formData.guardian_father_name,
            id_number: formData.guardian_dedup_id_number,
            document_type: formData.guardian_dedup_identification,
            citizenship_number: null,
            place_of_issue: formData.guardian_place_of_issue,
            dob_ad: formData.guardian_date_of_birth_ad,
            dob_bs: formData.guardian_date_of_birth_bs,
          }
        );

        if (dedupResponse) {
          this.toast.success(dedupResponse?.data?.data?.dedup_message);
        }

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

        this.setFormData((prev) => ({
          ...prev,
          guardian_personal_screening_data: cleanedResponseData || [],
          guardian_screening_ref_code: String(responseData?.screening_id),
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
      !(
        this.formData?.case_status !== "Draft" ||
        this.formData?.case_status !== "Proceed"
      ) && (this.nationalityChanged = true);
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

      const sameAsPermanentOnChange = (value) => {
        setTimeout(() => {
          this.setFormData((prevFormData) => {
            let updatedFormData = { ...prevFormData };
            updatedFormData.guardian_same_as_permanent = value;

            if (value) {
              updatedFormData = {
                ...updatedFormData,
                guardian_current_country:
                  updatedFormData.guardian_permanent_country || "NP",
                guardian_current_province:
                  updatedFormData.guardian_permanent_province || "",
                guardian_current_district:
                  updatedFormData.guardian_permanent_district || "",
                guardian_current_municipality:
                  updatedFormData.guardian_permanent_municipality || "",
                guardian_current_ward_number:
                  updatedFormData.guardian_permanent_ward_number || "",
                guardian_current_street_name:
                  updatedFormData.guardian_permanent_street_name || "",
                guardian_current_town:
                  updatedFormData.guardian_permanent_town || "",
                guardian_current_house_number:
                  updatedFormData.guardian_permanent_house_number || "",
                guardian_current_outside_town:
                  updatedFormData.guardian_permanent_outside_town || "",
                guardian_current_outside_street_name:
                  updatedFormData.guardian_permanent_outside_street_name,
                guardian_current_postal_code:
                  updatedFormData.guardian_permanent_postal_code,
              };
            } else {
              updatedFormData = {
                ...updatedFormData,
                guardian_same_as_permanent: value,
                guardian_current_country: "NP", // Default
                guardian_current_province: "",
                guardian_current_district: "",
                guardian_current_municipality: "",
                guardian_current_ward_number: "",
                guardian_current_street_name: "",
                guardian_current_town: "",
                guardian_current_house_number: "",
                guardian_current_outside_town: "",
                guardian_current_outside_street_name: "",
                guardian_current_postal_code: "",
              };
            }

            return updatedFormData;
          });
        }, 100);
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
          "guardian_has_cif",
          "guardian_cif_number",
          "guardian_cif_enquiry",
          "guardian_customer_type_id",
          "account_info",
          "is_minor_account",

          "guardian_first_name",
          "guardian_middle_name",
          "guardian_last_name",
          "guardian_last_name_not_available",
          "guardian_father_name",
          "guardian_date_of_birth_ad",
          "guardian_date_of_birth_bs",
          "guardian_is_nrn",
          "guardian_is_refugee",
          "guardian_nationality",
          "guardian_dedup_current_country",
          "guardian_dedup_identification",
          "guardian_issuing_authority",
          "guardian_place_of_issue",
          "guardian_dedup_id_number",

          "guardian_dedup_check",
          "guardian_dedup_module_data",
          "guardian_personal_screening_data",
          "guardian_screening_ref_code",

          "guardian_salutation",
          "guardian_gender",
          "guardian_marital_status",
          "guardian_email",
          "guardian_email_not_available",
          "guardian_literacy",
          "guardian_educational_qualification",
          "guardian_is_bank_staff",
          "guardian_staff_id",
          "guardian_is_us_person",

          "guardian_related_party_family_account_holder",
          "guardian_related_party_relation_with_account_holder",

          "guardian_family_information",

          "guardian_permanent_country",
          "guardian_permanent_province",
          "guardian_permanent_district",
          "guardian_permanent_municipality",
          "guardian_permanent_ward_number",
          "guardian_permanent_street_name",
          "guardian_permanent_town",
          "guardian_permanent_house_number",
          "guardian_permanent_outside_town",
          "guardian_permanent_outside_street_name",
          "guardian_permanent_postal_code",
          "guardian_residential_status",

          "guardian_same_as_permanent",
          "guardian_current_country",
          "guardian_current_province",
          "guardian_current_district",
          "guardian_current_municipality",
          "guardian_current_ward_number",
          "guardian_current_street_name",
          "guardian_current_town",
          "guardian_current_house_number",
          "guardian_current_outside_town",
          "guardian_current_outside_street_name",
          "guardian_current_postal_code",
          "guardian_contact_type",

          "guardian_mobile_country_code",
          "guardian_mobile_number",
          "guardian_phone_country_code",
          "guardian_phone_number",

          "guardian_is_customer_disabled",
          "guardian_national_id_number",
          "guardian_national_id_issue_date_ad",
          "guardian_national_id_issue_date_bs",
          "guardian_national_id_issue_place",
          "guardian_national_id_issuing_authority",
          "guardian_nid_verified",
          "guardian_nid_verify",
          "guardian_nid_reset",
          "guardian_id_type_details",

          "guardian_occupation_type",
          "guardian_source_of_income",

          "guardian_occupation_detail",
          "guardian_business_type",
          "guardian_personal_info_screening",
          "screening_filter",
          "guardian_personal_screening_data",
          "guardian_screening_ref_code",

          "guardian_annual_volume_of_transactions",
          "guardian_annual_number_of_transactions",
          "guardian_monthly_volume_of_transactions",
          "guardian_monthly_number_of_transactions",
          "guardian_yearly_income",
          "guardian_transaction_justification",
          "guardian_transaction_fund_details",

          "guardian_pep",
          "guardian_pep_category",
          "guardian_pep_declaration",
          "guardian_family_pep_declaration",
          "guardian_adverse_media",
          "guardian_adverse_category",
          "entitled_with_fund",
          "guardian_existing_risk_rating",
          "guardian_loan_status",
          "guardian_is_blacklisted",
          "guardian_customer_introduce_by",
          "guardian_employee_id",
          "guardian_introducer_account_number",
          "guardian_met_in_person",

          "blacklist_min_score",
          "sanction_min_score",
          "pep_min_score",
          "adverse_media_min_score",
          "max_result",

          "guardian_is_existing_cif",
          "guardian_is_block_list",
          "guardian_scheme_check",
          "guardian_is_cib_list",
          "guardian_is_sanction",
          "guardian_screening_ref_number",
          "guardian_external_cdd_id",
          "guardian_risk_level",
          "guardian_calculate_risk",
          "guardian_risk_score",

          "cif_data",
        ],
        connectedPairs: [
          ["guardian_last_name", "guardian_last_name_not_available"],
          ["guardian_email", "guardian_email_not_available"],
        ],

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

        guardian_marital_status: {
          "ui:options": {
            onChange: (value) => {
              this.updateFamilyInformation(value);
            },
          },
        },

        guardian_is_customer_disabled: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
        },
        guardian_nid_verify: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonPopupWidget"
            : "hidden",
          "ui:label": false,
          "ui:classNames": "mt-2 w-100",
          // "ui:options": {
          //   disableButton: (formData) => !formData?.guardian_national_id_number,
          //   buttonClassName: "w-100",
          //   onClick: async (formData) => {
          //     this.addLoader("guardian_nid_verify", true);
          //     let nidVerifiedValue = "No";

          //     try {
          //       const response = await this.axios.post(
          //         `${this.mainRouteURL}/external-api/verify-nid`,
          //         {
          //           nin: formData?.guardian_national_id_number,
          //           first_name: formData?.guardian_first_name,
          //           last_name: formData?.guardian_last_name,
          //           middle_name: formData?.guardian_middle_name,
          //           date_of_birth: formData?.guardian_date_of_birth_ad,
          //         }
          //       );

          //       const responseData = response?.data;
          //       nidVerifiedValue = responseData?.resCod == "200" ? "Yes" : "No";
          //       this.setModalOpen({
          //         open: true,
          //         message: responseData?.data?.message,
          //         close: "Close",
          //         status: "success",
          //       });
          //     } catch (err) {
          //       nidVerifiedValue = "No";
          //       this.setModalOpen({
          //         open: true,
          //         message: err?.response?.data?.message,
          //         close: "Close",
          //         status: "error",
          //       });
          //     } finally {
          //       this.addLoader("guardian_nid_verify", false);
          //       this.setFormData((prevForm) => ({
          //         ...prevForm,
          //         guardian_nid_verified: nidVerifiedValue,
          //       }));
          //     }
          //   },
          // },
        },
        guardian_nid_reset: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonField"
            : "hidden",
          "ui:label": false,
          "ui:classNames": "mt-5 w-100",
          "ui:options": {
            disableButton: (formData) => !formData?.guardian_nid_verified,
            buttonClassName: "w-100",
            onClick: async (formData) => {
              this.dropdownReset({
                guardian_national_id_number: null,
                guardian_national_id_issue_date_ad: "",
                guardian_national_id_issue_date_bs: "",
                guardian_national_id_issue_place: "",
                guardian_nid_verified: "",
              });
            },
          },
        },

        guardian_annual_volume_of_transactions: {
          "ui:options": {
            amount: true,
          },
        },
        guardian_monthly_volume_of_transactions: {
          "ui:options": {
            amount: true,
          },
        },
        guardian_yearly_income: {
          "ui:options": {
            amount: true,
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
        cif_data: {
          "ui:widget": "hidden",
        },
        guardian_customer_type_id: {},

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

        guardian_father_name: {
          "ui:options": {
            onChange: (value) => {
              this.convertToArray(
                value,
                "guardian_family_member_full_name",
                "guardian_family_information"
              );
            },
          },
        },
        declared_anticipated_annual_transaction: {
          "ui:options": {
            addonBefore: "Customer",
            amount: true,
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

        guardian_is_nrn: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                guardian_is_nrn: value,
                guardian_dedup_identification: value === "Yes" ? "NRN" : null,
                guardian_issuing_authority: value === "Yes" ? "MOEXA" : null,
                guardian_place_of_issue: null,
                guardian_dedup_id_number: "",
              });
            },
          },
        },

        guardian_is_refugee: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                guardian_is_refugee: value,
                guardian_dedup_identification: value === "Yes" ? "REF" : null,
                guardian_issuing_authority: value === "Yes" ? "NUCRA" : null,
                guardian_place_of_issue: null,
                guardian_dedup_id_number: "",
              });
            },
          },
        },

        guardian_nationality: {
          "ui:options": {
            onChange: async (value) => {
              this.dropdownReset({
                guardian_nationality: value,
                guardian_current_country: value === "NP" ? "NP" : null,
                guardian_dedup_identification:
                  this.formData?.guardian_is_nrn?.includes("Yes")
                    ? this.formData?.guardian_dedup_identification
                    : this.formData?.guardian_is_refugee?.includes("Yes")
                    ? this.formData?.guardian_dedup_identification
                    : null,
                guardian_issuing_authority:
                  this.formData?.guardian_is_nrn?.includes("Yes")
                    ? this.formData?.guardian_issuing_authority
                    : this.formData?.guardian_is_refugee?.includes("Yes")
                    ? this.formData?.guardian_issuing_authority
                    : null,
                guardian_place_of_issue: value === "NP" ? null : "FORCT",
                guardian_dedup_id_number: "",
              });
            },
          },
        },

        guardian_dedup_current_country: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                guardian_dedup_current_country: value,
                guardian_current_country: value,
                guardian_dedup_identification:
                  this.formData?.guardian_is_nrn?.includes("Yes")
                    ? this.formData?.guardian_dedup_identification
                    : this.formData?.guardian_is_refugee?.includes("Yes")
                    ? this.formData?.guardian_dedup_identification
                    : null,
                guardian_issuing_authority:
                  this.formData?.guardian_is_nrn?.includes("Yes")
                    ? this.formData?.guardian_issuing_authority
                    : this.formData?.guardian_is_refugee?.includes("Yes")
                    ? this.formData?.guardian_issuing_authority
                    : null,
                guardian_place_of_issue: value === "NP" ? null : "FORCT",
                guardian_dedup_id_number: "",
              });
            },
          },
        },

        guardian_dedup_identification: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData, index) => {
              const filterOption = this.functionGroup?.getRequiredDocuments(
                this.optionsData["multi_validation_mapping"],
                {
                  nationality:
                    formData?.guardian_nationality ||
                    this.formData?.guardian_nationality,
                  account_type: "INDIVIDUAL",
                  ...((formData?.guardian_nationality ||
                    this.formData?.guardian_nationality) === "NP" && {
                    current_country:
                      formData?.guardian_current_country ||
                      this.formData?.guardian_current_country,
                  }),
                }
              );

              return filterOption || [];
            },
            onChange: (value) => {
              this.dropdownReset({
                guardian_dedup_identification: value,
                guardian_issuing_authority:
                  defaultSelectedValue(value)?.[0]?.value,
                guardian_place_of_issue:
                  this.formData?.guardian_nationality === "NP" ? null : "FORCT",
                guardian_dedup_id_number: "",
              });
            },
          },
        },

        guardian_issuing_authority: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            setDisabled: (formData, index) => {
              return (formData?.guardian_nationality === "IN" &&
                formData?.guardian_dedup_identification === "DL") ||
                (formData?.guardian_nationality !== "IN" &&
                  formData?.guardian_dedup_identification === "DL")
                ? true
                : defaultSelectedValue(
                    formData?.guardian_dedup_identification ||
                      this.formData?.guardian_dedup_identification
                  )?.length === 1
                ? true
                : false;
            },
            getOptions: (formData, index) => {
              return defaultSelectedValue(
                formData?.guardian_dedup_identification ||
                  this.formData?.guardian_dedup_identification
              );
            },
            onChange: (value) => {
              this.dropdownReset({
                guardian_issuing_authority: value,
                guardian_place_of_issue: null,
                guardian_dedup_id_number: "",
              });
            },
          },
        },

        guardian_dedup_id_number: {
          "ui:options": {
            onChange: (value) => {
              this.convertToArray(
                value,
                "identification_number",
                "guardian_id_type_details",
                ["guardian_dedup_identification", "id_type_id"]
              );
            },
          },
        },

        guardian_national_id_issue_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Issued Date (A.D)",
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            enforceAgeRestriction: false,
            validAge: 0,
            name: "guardian_national_id_issue_date_ad",
            enforceAgeRestriction: true,
            disableFutureDates: true,
            minimumDate: (formData) => {
              return (
                formData?.guardian_date_of_birth_ad &&
                this.moment(formData?.guardian_date_of_birth_ad)
                  .add(1, "day")
                  .format("YYYY-MM-DD")
              );
            },
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "guardian_national_id_issue_date_ad"
              );
            },
          },
        },
        guardian_national_id_issue_date_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            enforceAgeRestriction: true,
            disableFutureDates: true,
            validAge: 0,
            name: "guardian_national_id_issue_date_bs",
            minimumDate: (formData) => {
              return (
                formData?.guardian_date_of_birth_bs &&
                this.moment(formData?.guardian_date_of_birth_bs).format(
                  "YYYY-MM-DD"
                )
              );
            },
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "guardian_national_id_issue_date_bs"
              );
            },
          },
        },
        guardian_dedup_module_data: {
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
                guardian_dedup_module_data: tableData,
              }));
            },
            disabledButton: !this.form_status?.includes("case-init") && [
              "match",
            ],
            actionHandlers: {
              view: (record) => setIsModalVisible(true),
              ...(this.form_status?.includes("case-init") && {
                match: (record) => {
                  if (record?.cif_number !== "-") {
                    this.setFormData((prev) => ({
                      ...prev,
                      guardian_has_cif: true,
                      guardian_cif_number: record?.cif_number,
                    }));
                    this.fetchIndividualInfoCIFDetail(record?.cif_number);
                  } else {
                    this.setModalOpen({
                      open: true,
                      message: "CIF number unavailable",
                      close: "Close",
                      status: "info",
                    });
                  }
                },
              }),
            },
          },
        },
        guardian_related_party_relation_with_account_holder: {
          // "ui:widget": "CascadeDropdown",
          // "ui:options": {
          //   getOptions: (formData) => {
          //     return this.filterOptions(
          //       "relationships",
          //       "MINOR"
          //     );
          //   },
          // },
        },

        guardian_salutation: {
          "ui:widget": "CustomRadioWidget",
          "ui:options": {
            onChange: (value) =>
              setTimeout(() => {
                this.dropdownReset({
                  guardian_salutation: value,
                  guardian_gender: value === "MR." ? "M" : "F",
                });
              }, 600),
          },
        },
        guardian_permanent_country: {
          "ui:options": {
            onChange: (value) => {
              return this.dropdownReset({
                guardian_permanent_country: value,
                guardian_permanent_province: null,
                guardian_permanent_district: null,
                guardian_permanent_municipality: null,
                guardian_permanent_house_number: "",
                guardian_permanent_ward_number: "",
                guardian_permanent_town: "",
                guardian_permanent_street_name: "",
                guardian_permanent_outside_town: "",
                guardian_permanent_outside_street_name: "",
                guardian_permanent_postal_code: "",
              });
            },
          },
        },
        account_type_id: {
          "ui:options": {
            onChange: (value) => {
              return this.dropdownReset({
                account_type_id: value,
                account_scheme_id: null,
              });
            },
          },
        },
        account_scheme_id: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "scheme_type",
                formData?.account_type_id
              );
            },
          },
        },
        guardian_gender: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "genders",
                formData?.guardian_salutation
              );
            },
          },
        },

        guardian_mobile_number: {
          "ui:options": {
            inputMode: "decimal",
            onInput: (e) => {
              e.currentTarget.value = e.currentTarget.value.replace(
                /[^0-9]/g,
                ""
              );
            },
          },
        },

        guardian_phone_number: {
          "ui:options": {
            inputMode: "decimal",
            onInput: (e) => {
              e.currentTarget.value = e.currentTarget.value.replace(
                /[^0-9]/g,
                ""
              );
            },
          },
        },

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

        guardian_same_as_permanent: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) => sameAsPermanentOnChange(value),
            preserveValue: true,
          },
        },
        guardian_email_not_available: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) => handleSetNotAvailable(value, "guardian_email"),
            preserveValue: true,
          },
        },

        guardian_permanent_province: {
          "ui:options": {
            onChange: (value) =>
              this.dropdownReset({
                guardian_permanent_province: value,
                guardian_permanent_district: null,
                guardian_permanent_municipality: null,
                guardian_permanent_house_number: "",
                guardian_permanent_ward_number: "",
                guardian_permanent_town: "",
                guardian_permanent_street_name: "",
                guardian_permanent_outside_town: "",
                guardian_permanent_outside_street_name: "",
              }),
          },
        },
        guardian_permanent_district: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "districts",
                formData?.guardian_permanent_province
              );
            },
            onChange: (value) =>
              this.dropdownReset({
                guardian_permanent_district: value,
                guardian_permanent_municipality: null,
                guardian_permanent_house_number: "",
                guardian_permanent_ward_number: "",
                guardian_permanent_town: "",
                guardian_permanent_street_name: "",
                guardian_permanent_outside_town: "",
                guardian_permanent_outside_street_name: "",
              }),
          },
        },
        guardian_permanent_municipality: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "local_bodies",
                formData?.guardian_permanent_district
              );
            },
          },
        },

        guardian_id_type_details: {
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
                  const newSelectedData =
                    formData?.guardian_id_type_details?.map((item, idx) =>
                      idx !== index ? item?.id_type_id : null
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
                    this.formData?.guardian_id_type_details?.[index]
                      ?.id_type_id;
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
                        formData?.guardian_id_type_details?.[index]
                          ?.id_type_id === "DL") ||
                      (formData?.nationality !== "IN" &&
                        formData?.guardian_id_type_details?.[index]
                          ?.id_type_id === "DL")
                    ? true
                    : defaultSelectedValue(
                        formData?.guardian_id_type_details?.[index]
                          ?.id_type_id ||
                          this.formData?.guardian_id_type_details?.[index]
                            ?.id_type_id
                      )?.length === 1
                    ? true
                    : false;
                },
                getOptions: (formData, index) => {
                  return defaultSelectedValue(
                    formData?.guardian_id_type_details?.[index]?.id_type_id ||
                      this.formData?.guardian_id_type_details?.[index]
                        ?.id_type_id
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
                  const minDateValue = formData?.guardian_id_type_details?.map(
                    (item) =>
                      this.moment(formData?.date_of_birth_ad)
                        .add(16, "years")
                        .format("YYYY-MM-DD")
                  );

                  return minDateValue && minDateValue[0];
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
                  const minDateValue = formData?.guardian_id_type_details?.map(
                    (item) =>
                      formData?.date_of_birth_ad &&
                      this.NepaliDate.parseEnglishDate(
                        this.moment(formData?.date_of_birth_ad)
                          .add(16, "years")
                          .format("YYYY-MM-DD"),
                        "YYYY-MM-DD"
                      ).format("YYYY-MM-DD")
                  );
                  return minDateValue && minDateValue[0];
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

        guardian_occupation_type: {
          // "ui:widget": "CascadeDropdown",
          "ui:options": {
            // getOptions: (formData) => {
            //   return this.filterOptionsOccupation(
            //     "occupation_rule",
            //     "occupation_list"
            //   );
            // },
            onChange: (value) =>
              this.dropdownReset({
                guardian_occupation_type: value,
                guardian_source_of_income: this.optionsData[
                  "occupation_rule"
                ]?.[`source_of_income_list`]?.find((item) =>
                  item?.cascade_id?.includes(value)
                )?.id,
              }),
          },
        },

        guardian_source_of_income: {
          // "ui:widget": "CascadeDropdown",
          "ui:options": {
            // getOptions: (formData) => {
            //   return this.filterOptionsOccupation(
            //     "occupation_rule",
            //     "source_of_income_list",
            //     formData?.guardian_occupation_type
            //   );
            // },
          },
        },

        guardian_occupation_detail: {
          "ui:classNames": "my-1",
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
            guardian_business_type: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  const filteredData = this.filterOptionsOccupation(
                    "occupation_rule",
                    "business_type_list",
                    formData?.guardian_occupation_type
                  );
                  return [
                    ...filteredData,
                    { label: "Others", value: "others" },
                  ];
                },
              },
            },
          },
        },

        guardian_family_information: {
          "ui:widget": "EditableTableWidget",
          "ui:label": false,
          "ui:options": {
            orderable: false,
            addable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("reporting") ||
              this.form_status?.includes("Completed")
            ),
            removable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("reporting") ||
              this.form_status?.includes("Completed")
            ),
            fieldKeys: ["guardian_family_member_relation"],
            disableSpecificKeys: this.form_status?.includes("init")
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
          items: {
            guardian_family_member_relation: {
              "ui:widget": "CascadeDropdown",
              "ui:placeholder": "Select Relationship",
              "ui:disabled": true,
              "ui:options": {
                getOptions: (formData, rowIndex) => {
                  const familyInfo =
                    formData?.guardian_family_information || [];

                  const currentValue =
                    familyInfo[
                      rowIndex
                    ]?.guardian_family_member_relation?.trim() || "";

                  const usedBefore = familyInfo
                    .slice(0, rowIndex)
                    .map((item) =>
                      item?.guardian_family_member_relation?.trim()
                    )
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
            guardian_family_member_full_name: {
              "ui:placeholder": "Enter Full Name",
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.form_status.includes("init") ||
                  this.form_status.includes("update")
                    ? formData?.guardian_family_information?.[index ?? 0]
                        ?.guardian_is_family_name_not_available ??
                      (formData?.guardian_family_information?.[index ?? 0]
                        ?.guardian_family_member_relation === "FATHE" &&
                      formData?.guardian_father_name
                        ? true
                        : false)
                    : true,
              },
            },

            guardian_is_family_name_not_available: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.form_status.includes("init") ||
                  this.form_status.includes("update")
                    ? formData?.guardian_family_information?.[index ?? 0]
                        ?.guardian_family_member_relation === "FATHE" &&
                      formData?.guardian_father_name
                      ? true
                      : false
                    : true,
                onChange: (value, index) => {
                  this.familyNameChange(
                    "guardian_family_member_full_name",
                    value,
                    "guardian_family_information",
                    index ?? 0
                  );
                },
              },
            },
          },
        },

        guardian_annual_income: {
          "ui:options": {
            amount: true,
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

              const isDedupCheck = !!formData?.guardian_dedup_module_data;

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

        guardian_personal_info_screening: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:classNames": "my-1",
          "ui:options": {
            block: true,
            disableButton: (formData) => {
              let requiredFields = [
                "guardian_first_name",
                "guardian_last_name",
                "guardian_father_name",
                "guardian_date_of_birth_ad",
                "guardian_date_of_birth_bs",
                "guardian_dedup_identification",
                "guardian_dedup_id_number",
                "guardian_salutation",
                "guardian_gender",
                "guardian_marital_status",
                "guardian_email",
                "guardian_nationality",
                "guardian_contact_type",
                "guardian_occupation_type",
                "guardian_source_of_income",
                "guardian_related_party_family_account_holder",
                "guardian_related_party_relation_with_account_holder",
                "guardian_customer_type_id",
              ];
              const allFilled = requiredFields.every((field) => {
                const value = formData?.[field];
                return value !== undefined && value !== null && value !== "";
              });

              const isDedupCheck = !!formData?.guardian_dedup_module_data;

              const isTrue = !(allFilled && isDedupCheck);
              return this.form_status?.includes("init") && isTrue;
            },
            // onClick: () => {
            //   this.fetchPersonalInfoScreening();
            //   setFormData((prevData) => ({
            //     ...prevData,
            //     guardian_is_existing_cif: false,
            //     guardian_scheme_check: false,
            //     guardian_is_cib_list: false,
            //     guardian_is_block_list: false,
            //     guardian_is_sanction: false,
            //   }));
            // },
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

        guardian_is_existing_cif: {
          "ui:widget": "hidden",
        },
        guardian_is_block_list: {
          "ui:widget": "hidden",
        },
        guardian_scheme_check: {
          "ui:widget": "hidden",
        },
        guardian_is_cib_list: {
          "ui:widget": "hidden",
        },
        guardian_is_sanction: {
          "ui:widget": "hidden",
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
