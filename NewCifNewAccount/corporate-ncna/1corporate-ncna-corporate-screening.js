(function () {
  if (window.UISchemaFactory) {
    delete window.UISchemaFactory;
  }
  //backup
  class UISchemaFactory {
    constructor(masterDataUrl, options = {}) {
      this.form_status = options.form_status;
      this.token = options.token;
      this.adToBs = options.adToBs;
      this.bsToAd = options.bsToAd;
      this.moment = options.moment;
      this.jsonSchema = options.jsonSchema;
      this.mainRouteURL = options.mainRouteURL;
      this.setJsonSchema = options.setJsonSchema;
      this.status = options.status;
      this.paramsId = options.paramsId;
      this.eachStepDataUrl = options.eachStepDataUrl;
      this.masterDataUrl = masterDataUrl;
      this.setFetchedData = options.setFetchedData;
      this.fetchedData = options.fetchedData;
      this.isMasterDataLoaded = false;
      this.optionsData = options.optionsData;
      this.setOptionsData = options.setOptionsData;
      this.setUiSchema = options.setUiSchema;
      this.setFormData = options.setFormData;
      this.axios = options.axios;
      this.setDivide = options.setDivide;
      this.setNextStep = options.setNextStep;
      this.setRenderFormKey = options.setRenderFormKey;
      this.toast = options.toast;
      this.buttonLoader = false;
      this.functionGroup = options.functionGroup;
    }

    customValidate(formData, errors, uiSchema) {
      const registrationMunicipality = this.optionsData["local_bodies"]?.find(
        (item) => item?.id === formData?.registration_municipality
      )?.title;
      const mailingMunicipality = this.optionsData["local_bodies"]?.find(
        (item) => item?.id === formData?.mailing_municipality
      )?.title;

      const clonedFormData = JSON.parse(JSON.stringify(formData));
      clonedFormData.mailing_municipality = mailingMunicipality;
      clonedFormData.registration_municipality = registrationMunicipality;
      this.functionGroup?.validateCombinedLength(clonedFormData, errors, {
        type: "registration",
        fieldNames: {
          town: "ward_number",
          street: "street",
          postalCode: "municipality",
        },
      });
      this.functionGroup?.validateCombinedLength(clonedFormData, errors, {
        type: "mailing",
        fieldNames: {
          town: "ward_number",
          street: "street",
          postalCode: "municipality",
        },
      });

      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "registration",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });
      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "mailing",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });

      const hasUncheckedView = Object.keys(formData?.screening_card || {}).map(
        (key) => {
          const items = formData.screening_card[key];

          return (
            Array.isArray(items) &&
            items.every(
              (item) =>
                typeof item === "object" &&
                item !== null &&
                item.hasOwnProperty("isCheckedView")
            )
          );
        }
      );

      const addHasUncheckedView = hasUncheckedView.some(
        (value) => value === false
      );

      if (addHasUncheckedView) {
        errors?.screening_card?.addError("View all Screening Data To Continue");
      }

      return errors;
    }

    getNepaliYears = () => {
      const currentYear = new Date().getFullYear() + 57;
      const nepaliYears = [];
      for (let year = 1900; year <= currentYear; year++) {
        nepaliYears.push({
          label: `${year}/${year + 1}`,
          value: `${year}/${year + 1}`,
        });
      }

      return nepaliYears.reverse();
    };
    //Render Form
    async renderForm() {
      this.setRenderFormKey((prev) => prev + 1);
    }

    //Reset Dropdown
    dropdownReset = async (dropdownClearObject, arrayName, index) => {
      setTimeout(() => {
        this.setFormData((prevFormData) => {
          const filterMatchingKeys = (target, source) => {
            return Object.fromEntries(
              Object.entries(source).filter(([key]) => key in target)
            );
          };

          if (arrayName) {
            const updatedArray = prevFormData[arrayName]?.map(
              (item, arrIndex) => {
                if (arrIndex === index) {
                  const filteredObject = filterMatchingKeys(
                    item,
                    dropdownClearObject
                  );
                  return { ...item, ...filteredObject };
                }
                return item;
              }
            );

            return { ...prevFormData, [arrayName]: updatedArray };
          } else {
            const filteredObject = filterMatchingKeys(
              prevFormData,
              dropdownClearObject
            );
            return { ...prevFormData, ...filteredObject };
          }
        });
      }, 100);
    };

    // FUNCTION TO FILTER OPTIONS AS PER CASCADE
    filterOptions = (key, cascadeValue) => {
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
    };

    filterOptionsByAccount(masterDataKey, formData) {
      const strictKey = "account_type_id";
      const softKeys = ["currency", "nationality"];

      return this.optionsData[masterDataKey]
        ?.filter((item) => {
          const relationMatch =
            item.account_categories === formData.account_info;

          if (!relationMatch) return false;

          if (formData[strictKey] && item[strictKey] !== formData[strictKey]) {
            return false;
          }

          const softMatch = softKeys.every((key) => {
            if (!formData[key]) return true;

            const itemValue = item[key];

            if (itemValue == null) return true;

            if (Array.isArray(itemValue)) {
              return itemValue.includes(formData[key]);
            }

            return itemValue === formData[key];
          });

          return softMatch;
        })
        .map((item) => ({
          label: `${item.title} - ${item?.cbs_code}`,
          value: item?.fg_code || item?.cbs_code || item?.id,
        }));
    }

    //Add Loader

    convertDate(
      selectedDate,
      setFormData,
      fromAdToBs,
      fieldKey,
      arrayName = null,
      index = null
    ) {
      const fieldMapping = {
        registration_date_ad: ["registration_date_ad", "registration_date_bs"],
        registration_date_bs: ["registration_date_ad", "registration_date_bs"],
        registration_expiry_date_ad: [
          "registration_expiry_date_ad",
          "registration_expiry_date_bs",
        ],
        registration_expiry_date_bs: [
          "registration_expiry_date_ad",
          "registration_expiry_date_bs",
        ],
        license_issuing_date_ad: [
          "license_issuing_date_ad",
          "license_issuing_date_bs",
        ],
        license_issuing_date_bs: [
          "license_issuing_date_ad",
          "license_issuing_date_bs",
        ],
        license_expiry_date_ad: [
          "license_expiry_date_ad",
          "license_expiry_date_bs",
        ],
        license_expiry_date_bs: [
          "license_expiry_date_ad",
          "license_expiry_date_bs",
        ],
        pan_issue_date_ad: ["pan_issue_date_ad", "pan_issue_date_bs"],
        pan_issue_date_bs: ["pan_issue_date_ad", "pan_issue_date_bs"],
        id_issued_date_ad: ["id_issued_date_ad", "id_issued_date_bs"],

        id_issued_date_bs: ["id_issued_date_ad", "id_issued_date_bs"],

        id_expiry_date_ad: ["id_expiry_date_ad", "id_expiry_date_bs"],

        id_expiry_date_bs: ["id_expiry_date_ad", "id_expiry_date_bs"],
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

        return updatedFormData;
      });
      this.setRenderFormKey((prevData) => {
        return prevData + 1;
      });
    }

    convertDateMultipleLayer(
      selectedDate,
      setFormData,
      fromAdToBs,
      index,
      baseField,
      arrayPath
    ) {
      const adField = `${baseField}_ad`;
      const bsField = `${baseField}_bs`;

      const pathParts =
        typeof arrayPath === "string" && arrayPath.length > 0
          ? arrayPath.split(".")
          : [];

      setFormData((prev) => {
        const newData = { ...prev };
        let currentLevel = newData;
        pathParts.forEach((part, level) => {
          const idx = index[level];

          if (!currentLevel[part]) return;

          if (Array.isArray(currentLevel[part])) {
            currentLevel[part] = currentLevel[part].map((item, i) => {
              if (i === idx) {
                if (level === pathParts.length - 1) {
                  const convertedDate = fromAdToBs
                    ? this.adToBs(selectedDate)
                    : this.bsToAd(selectedDate);
                  return {
                    ...item,
                    [adField]: fromAdToBs ? selectedDate : convertedDate,
                    [bsField]: fromAdToBs ? convertedDate : selectedDate,
                  };
                }
                return { ...item };
              }
              return item;
            });
          }

          currentLevel = currentLevel[part][idx];
        });

        return newData;
      });

      fromAdToBs && this.renderForm();
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

    filterMasterData(masterDataKey, formData) {
      const strictKey = "account_type_id";
      debugger;
      const softKeys = ["currency", "nationality"];

      return this.optionsData[masterDataKey]

        .filter((item) => {
          // Step 1: Relation must match
          const relationMatch =
            item.account_categories === formData.account_info;

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
          label: item.title,

          value: item?.fg_code || item?.cbs_code || item?.id,
        }));
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

    async fetchCorporateInfoCIFDetail(cif) {
      this.addLoader("cif_enquiry", true);
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry/corporate`,
          {
            cif_number: cif || this.formData.cif_number,
            form_title: "corporate_screening",
            id: this.case_id,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }

        const respData = response?.data?.data;
        const resp = {
          ...respData,
          dedup_corporate_name: respData?.name,
          dedup_corporate_registration_number: respData?.registration_number,
          dedup_corporate_pan_number: respData?.pan_number,
          cif_data: respData,
        };
        setTimeout(() => {
          this.setFormData((prev) => {
            const updatedData = { ...prev, ...resp };
            return updatedData;
          });
        }, 1000);
        // this.setUiSchema((prevSchema) => {
        //   const updatedUiSchema = { ...prevSchema };
        //   for (const key in resp) {
        //     const data = resp[key];
        //     const existing = updatedUiSchema[key];

        //     // Check if data is an array and has non-empty objects
        //     const shouldDisableArray =
        //       Array.isArray(data) && data.length > 0
        //         ? data.some((item) => Object.keys(item || {}).length > 0)
        //         : !!data;

        //     if (!shouldDisableArray) continue; // skip if array is empty or contains only empty object

        //     if (existing?.items) {
        //       updatedUiSchema[key] = {
        //         ...existing,
        //         "ui:options": {
        //           ...(existing["ui:options"] || {}),
        //           addable: false,
        //           removable: false,
        //           orderable: false,
        //         },
        //         "ui:disabled": true,
        //         items: {
        //           ...(existing?.items || {}),
        //           "ui:disabled": true,
        //         },
        //       };
        //     } else {
        //       updatedUiSchema[key] = {
        //         ...existing,
        //         "ui:disabled": true,
        //       };
        //     }
        //   }

        //   return updatedUiSchema;
        // });

        return;
      } catch (error) {
        console.warn("Something went wrong", error);
        return;
      } finally {
        this.addLoader("cif_enquiry", false);
      }
    }

    async fetchCorporateScreening() {
      this.addLoader("screening", true);
      try {
        let payload = {
          name: this.formData.name,
        };

        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/screening-check`,
          payload
        );

        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data?.screening_lists;

        this.setFormData((prevData) => ({
          ...prevData,
          screening_card: this.preprocessData(resp),
        }));

        resp &&
          this.setJsonSchema((prevJsonSchema) => {
            return {
              ...prevJsonSchema,

              isDisabled: false,
            };
          });

        this.setRenderFormKey((prev) => prev + 1);

        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
      } finally {
        this.addLoader("screening", false);
        this.renderForm();
      }
    }

    //Filter OPTIONS by CASCADE ID
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
        account_info: "account_category",
        account_type_id: "account_types",
        account_purpose: "account_purposes",
        currency: "currencies",
        account_scheme_id: "scheme_type",
        registration_authority: "issuing_authorities",
        registration_place: "districts",
        registration_place_country: "countries",
        country_of_incorporation: "countries",
        pan_place_of_issue: "districts",
        pan_issue_place: "districts",
        country_code: "country_codes",
        business_type: "business_type",
        business_type_id: "business_type",
        type_of_transaction: "business_type",
        constitution_code_id: "constitution_types",
        mobile_country_code: "country_codes",
        phone_country_code: "country_codes",
        license_issuing_authority: "issuing_authorities",
        registration_country: "countries",
        registration_province: "provinces",
        registration_district: "districts",
        registration_municipality: "local_bodies",
        head_office_country: "countries",
        head_office_province: "provinces",
        head_office_district: "districts",
        head_office_municipality: "local_bodies",
        pan_issuing_authority: "issuing_authorities",
        mailing_country: "countries",
        mailing_province: "provinces",
        mailing_district: "districts",
        mailing_municipality: "local_bodies",
        customer_type_id: "customer_types",
        legal_entity_type: "legal_entities",
        entity_class: "entity_classes",
        sectors: "sectors",
        sub_sectors: "sub_sectors",
        jurisdiction: "jurisdiction",
        jurisdiction_country: "countries",
        registration_place_country: "countries",
        id_type_id: "document_types",
        issue_country: "countries",
        issued_district: "districts",
        issued_district_text: "countries",
        issuing_authority: "issuing_authorities",
        fund_source: "income_sources",
      };

      const dataKey = fieldMapping[fieldKey] || fieldKey;
      let fieldOptions = optionsData[dataKey] || [];

      if (cascadeId !== null) {
        fieldOptions = this.filterOptionsByCascadeId(fieldOptions, cascadeId);
      }

      const enumValues = Array.from(
        new Set(
          fieldOptions.map((item) =>
            String(item?.fg_code || item?.cbs_code || item?.id)
          )
        )
      );
      const enumNames = fieldOptions.map((option) => option.title);
      setJsonSchema((prevSchema) => {
        if (!prevSchema || !prevSchema.properties) {
          console.warn("Invalid schema provided to setJsonSchema.");
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
                if (dependency.else) updateProperties(dependency.else);
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
      if (!this.form_status?.includes("case-init")) {
        this.setDivide(true);
      }
      const fieldsToUpdate = [
        "account_info",
        "account_purpose",
        "account_type_id",
        "currency",
        "constitution_Code",
        "registration_authority",
        "registration_place",
        "registration_country",
        "country_of_incorporation",
        "pan_place_of_issue",
        "license_issuing_authority",
        "registration_country",
        "registration_province",
        "registration_district",
        "registration_municipality",
        "head_office_country",
        "head_office_province",
        "head_office_district",
        "head_office_municipality",
        "pan_issuing_authority",
        "mailing_country",
        "mailing_province",
        "mailing_district",
        "mailing_municipality",
        "country_code",
        "business_type_id",
        "business_type",
        "type_of_transaction",
        "constitution_code_id",
        "pan_issue_place",
        "mobile_country_code",
        "phone_country_code",
        "customer_type_id",
        "legal_entity_type",
        "entity_class",
        "account_scheme_id",
        "jurisdiction",
        "jurisdiction_country",
        "registration_place_country",
        "id_type_id",
        "issue_country",
        "issued_district",
        "issued_district_text",
        "issuing_authority",
        "fund_source",
      ];

      // Update schema with options for fields present in the schema
      for (const fieldKey of fieldsToUpdate) {
        this.updateSchemaWithEnums(fieldKey, this.optionsData, setJsonSchema);
      }
      // Update fields based on conditions
      this.updateFieldsBasedOnConditions(formData, setJsonSchema);
    }

    updateFieldsBasedOnConditions(formData, setJsonSchema) {
      setJsonSchema((prevSchema) => {
        if (!prevSchema || !prevSchema.properties) {
          return prevSchema;
        }

        // Get the original schema's required fields
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

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
      (this.form_status?.includes("review") ||
        this.form_status?.includes("approval") ||
        this.form_status?.includes("Completed")) &&
        this.setJsonSchema((prevJsonSchema) => {
          return {
            ...prevJsonSchema,
            isDisabled: false,
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

      // Handle id_type_details cleanup (only keep first item)

      const validId = "e89c962c-0530-4950-bfa6-30bbbd874665";

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
      setTimeout(() => this.setFormData(result), 100);

      return result;
    }

    async getDedupCheck(formData) {
      const nonClearableField = [
        "dedup_corporate_name",
        "dedup_corporate_registration_number",
        "dedup_corporate_pan_number",
        "account_info",
        "name",
        "alias",
        "registration_number",
        "pan_number",
        "has_cif",
        "cif_number",
      ];
      this.addLoader("dedup_check", true);
      console.log(this.formData);

      !(this.formData?.has_cif || this.formData?.source === "ocr") &&
        this.formDataCleaner(nonClearableField);

      if (!this.formData?.dedup_corporate_name) {
        this.toast.error("Enter name for Corporate Name");
        return;
      }

      try {
        this.buttonLoader = true;

        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check/corporate`,

          {
            dedup_corporate_name: formData.dedup_corporate_name,
            dedup_corporate_registration_number:
              formData.dedup_corporate_registration_number,
            dedup_corporate_pan_number: formData.dedup_corporate_pan_number,
          }
        );

        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data?.dedup_response;

        if (resp?.message?.includes("No Data")) {
          this.toast.info(resp.message);
        } else {
          this.setFormData((prevData) => ({
            ...prevData,
            dedup_module_data: this.preprocessData(resp),
          }));
        }

        this.setRenderFormKey((prev) => prev + 1);

        return;
      } catch (error) {
        this.toast.error(error.response?.data?.message);

        return {};
      } finally {
        this.addLoader("dedup_check", false);
      }
    }

    updateSchemaReadonly = (schema, readonlyFields, readOnlyValue) => {
      if (!schema) return schema;

      const updatedSchema = { ...schema };

      // Handle properties
      if (updatedSchema.properties) {
        updatedSchema.properties = Object.fromEntries(
          Object.entries(updatedSchema.properties).map(([key, value]) => [
            key,
            readonlyFields.includes(key)
              ? { ...value, readOnly: readOnlyValue }
              : value,
          ])
        );
      }

      // Handle dependencies
      if (updatedSchema.dependencies) {
        updatedSchema.dependencies = Object.fromEntries(
          Object.entries(updatedSchema.dependencies).map(
            ([key, dependency]) => [
              key,
              {
                ...dependency,
                if: dependency.if
                  ? this.updateSchemaReadonly(
                      dependency.if,
                      readonlyFields,
                      readOnlyValue
                    )
                  : undefined,
                then: dependency.then
                  ? this.updateSchemaReadonly(
                      dependency.then,
                      readonlyFields,
                      readOnlyValue
                    )
                  : undefined,
                else: dependency.else
                  ? this.updateSchemaReadonly(
                      dependency.else,
                      readonlyFields,
                      readOnlyValue
                    )
                  : undefined,
                oneOf: dependency?.oneOf?.map((subSchema) =>
                  this.updateSchemaReadonly(
                    subSchema,
                    readonlyFields,
                    readOnlyValue
                  )
                ),
                allOf: dependency?.allOf?.map((subSchema) =>
                  this.updateSchemaReadonly(
                    subSchema,
                    readonlyFields,
                    readOnlyValue
                  )
                ),
              },
            ]
          )
        );
      }
      return updatedSchema;
    };
    createUISchema(options) {
      const {
        setJsonSchema,
        jsonSchema,
        formData,
        setFormData,
        ObjectFieldTemplate,
        widgets,
      } = options;
      this.initializeSchema(setJsonSchema, formData);
      const sameAsRegisteredAddressChange = (value) => {
        setFormData((prevFormData) => {
          let updatedFormData = { ...prevFormData };
          updatedFormData.same_as_registered_address = value;
          if (value) {
            updatedFormData = {
              ...updatedFormData,
              mailing_country: value
                ? updatedFormData?.registration_country
                : null,
              mailing_province: value
                ? updatedFormData?.registration_province
                : null,
              mailing_district: value
                ? updatedFormData?.registration_district
                : null,
              mailing_municipality: value
                ? updatedFormData?.registration_municipality
                : null,
              mailing_ward_number: value
                ? updatedFormData?.registration_ward_number
                : null,
              mailing_street_name: value
                ? updatedFormData?.registration_street_name
                : null,
              mailing_town: value ? updatedFormData?.registration_town : null,
              mailing_house_number: value
                ? updatedFormData?.registration_house_number
                : null,
              mailing_town: value ? updatedFormData?.registration_town : null,
              mailing_street: value
                ? updatedFormData?.registration_street
                : null,
              mailing_postal_code: value
                ? updatedFormData?.registration_postal_code
                : null,
            };
          }
          return updatedFormData;
        });

        setJsonSchema((prevJson) => {
          const dependentKeys = [
            "mailing_province",
            "mailing_district",
            "mailing_municipality",
            "mailing_ward_number",
            "mailing_street",
            "mailing_town",
            "mailing_house_number",
          ];

          return this.updateSchemaReadonly(prevJson, dependentKeys, value);
        });
      };

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": [
          "has_cif",
          "cif_number",
          "cif_enquiry",

          "dedup_corporate_name",
          "dedup_corporate_registration_number",
          "dedup_corporate_pan_number",
          "dedup_check",
          "dedup_module_data",

          "name",
          "alias",
          "legal_entity_type",
          "business_type_id",
          "customer_type_id",
          "constitution_code_id",
          "insurance_type",
          "tax_percentage",
          "entity_class",
          "sectors",
          "sub_sectors",
          "collect",

          "account_info",
          "currency",
          "account_purpose",
          "account_type_id",
          "account_scheme_id",
          "type_of_transaction",
          "registration_number",
          "registration_authority",
          "country_of_incorporation",
          "jurisdiction",
          "jurisdiction_country",
          "registration_place",
          "registration_place_country",
          "number_of_branches",
          "registration_date_ad",
          "registration_date_bs",
          "registration_expiry_date_ad",
          "registration_expiry_date_bs",
          "has_license",
          "license_details",
          "pan_number",
          "pan_issue_date_ad",
          "pan_issue_date_bs",
          "pan_issue_place",
          "pan_issuing_authority",
          "registration_country",
          "registration_province",
          "registration_district",
          "registration_municipality",
          "registration_ward_number",
          "registration_street",
          "registration_town",
          "registration_house_number",
          "registration_postal_code",
          "same_as_registered_address",
          "mailing_country",
          "mailing_province",
          "mailing_district",
          "mailing_municipality",
          "mailing_ward_number",
          "mailing_street",
          "mailing_town",
          "mailing_house_number",
          "mailing_postal_code",
          "contact_details",
          "id_type_details",
          "most_recent_audit_report",
          "fund_source",
          "income_year",
          "declared_anticipated_annual_transaction",
          "number_of_transaction",
          "yearly_income",
          "introducer_walk_in_customer",
          "introducer_bank_staff_id",
          "introducer_bank_staff_acount_number",
          "introducer_bank_staff_name",
          "introducer_account_holder_number",
          "introducer_account_holder_name",
          "is_us_person",
          "beneficial_owner",
          "approval_status",
          "approval_remarks",
          "screening",
          "screening_card",
          "cif_data",
          "source",
        ],
        collect: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return [
                {
                  label: "Collect by Person",
                  value: "C",
                },
                {
                  label: "Collect by Email",
                  value: "E",
                },
              ];
            },
          },
        },
        declared_anticipated_annual_transaction: {
          "ui:options": {
            addonBefore: "Customer",
            amount: true,
          },
        },
        expected_anticipated_annual_transaction: {
          "ui:options": {
            addonBefore: "Branch",
            amount: true,
          },
        },

        yearly_income: {
          "ui:options": {
            amount: true,
          },
        },

        number_of_transactions: {
          "ui:options": {
            maxLength: 4,
          },
        },
        insurance_type: {
          "ui:options": {
            onChange: (events) => {
              this.setFormData((prevFormData) => ({
                ...prevFormData,
                insurance_type: events,
                tax_percentage: events === "Life Insurance" ? "5%" : "15%",
              }));
            },
          },
        },
        country_of_incorporation: {
          "ui:options": {
            onChange: (events) => {
              setTimeout(() => {
                this.setFormData((prevFormData) => ({
                  ...prevFormData,
                  country_of_incorporation: events,
                  jurisdiction_country: events,
                  registration_place_country: events,
                }));
              }, 600);
            },
          },
        },
        cif_data: {
          "ui:widget": "hidden",
        },
        source: {
          "ui:widget": "hidden",
        },
        business_type_id: {
          "ui:options": {
            onChange: (events) => {
              this.setFormData((prevFormData) => ({
                ...prevFormData,
                business_type_id: events,
                type_of_transaction: events,
              }));
              this.setRenderFormKey((prev) => prev + 1);
            },
          },
        },
        type_of_transaction: {
          "ui:options": {
            setDisabled: () => {
              return this.formData?.business_type_id;
            },
          },
        },

        dedup_corporate_name: {
          "ui:options": {
            onBlurCapture: (events) =>
              setTimeout(() => {
                this.setFormData((prevFormData) => ({
                  ...prevFormData,
                  name: events?.target?.value,
                  alias: events?.target?.value,
                }));
              }, 600),
          },
        },
        dedup_corporate_registration_number: {
          "ui:options": {
            onBlurCapture: (events) =>
              setTimeout(() => {
                this.setFormData((prevFormData) => ({
                  ...prevFormData,
                  registration_number: events?.target?.value,
                }));
              }, 600),
          },
        },
        dedup_corporate_pan_number: {
          "ui:options": {
            maxLength: 9,
            onBlurCapture: (events) =>
              setFormData(() => {
                this.setFormData((prevFormData) => ({
                  ...prevFormData,
                  pan_number: events?.target?.value,
                }));
              }, 600),
          },
        },
        dedup_check: {
          "ui:widget": "hidden",
          "ui:label": false,
          // "ui:disabled": true,
          "ui:classNames":
            "d-flex justify-content-end align-items-end h-100 mt-5",
          "ui:options": {
            disableButton: (formData) =>
              !(
                formData?.dedup_corporate_name?.trim() &&
                formData?.dedup_corporate_registration_number?.trim()
              ),

            onClick: (formData) => {
              this.getDedupCheck(formData);
            },
          },
        },

        dedup_module_data: {
          "ui:widget":
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval") ||
            this.form_status?.includes("Completed")
              ? "hidden"
              : "ScreeningReportCard",

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

            actionHandlers: {
              view: (record) => setIsModalVisible(true),

              match: (record) => {
                if (record?.cif_number !== "-") {
                  this.setFormData((prev) => ({
                    ...prev,
                    has_cif: true,
                    cif_number: record?.cif_number,
                  }));
                  this.fetchCorporateInfoCIFDetail(record?.cif_number);
                } else {
                  this.setModalOpen({
                    open: true,
                    message: "CIF number unavailable",
                    close: "Close",
                    status: "info",
                  });
                }
              },
            },
          },
        },

        has_cif: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) =>
              !value &&
              setTimeout(
                () =>
                  setFormData((prev) => ({ account_info: prev?.account_info })),
                100
              ),
          },
        },
        has_license: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
        },
        account_info: {
          "ui:widget": "CustomRadioWidget",
          "ui:label": false,
        },
        name: {
          "ui:options": {
            setDisabled: (formData) => {
              return formData?.dedup_corporate_name;
            },
            onBlurCapture: (events) =>
              this.setFormData((prevFormData) => ({
                ...prevFormData,
                alias: events?.target?.value,
              })),
          },
        },
        alias: {
          "ui:help": "Other name as per AOA/MOA/By-laws",
        },
        legal_entity_type: {
          // "ui:widget": "CascadeDropdown",
          // "ui:options": {
          //   getOptions: (formData) =>
          //     this.filterOptions(
          //       "legal_entities",
          //       this.formData?.account_info || formData?.account_info
          //     ),
          // },
        },
        entity_class: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => this.filterOptions("entity_classes"),
          },
        },
        sectors: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => this.filterOptions("sectors"),
          },
        },
        sub_sectors: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => this.filterOptions("sub_sectors"),
          },
        },
        cif_enquiry: {
          "ui:widget": "ButtonField",
          "ui:label": false,
          "ui:classNames": "d-flex h-100 mt-5 align-items-center",
          "ui:disabled": this.formData?.guardian_cif_number,
          "ui:options": {
            disableButton: (formData) => !formData?.cif_number?.trim(),
            onClick: (formData) => {
              setTimeout(
                () =>
                  setFormData({
                    account_info: formData?.account_info,
                    has_cif: formData?.has_cif,
                    cif_number: formData?.cif_number,
                  }),
                100
              ),
                this.fetchCorporateInfoCIFDetail(null);
            },
          },
        },

        account_type_id: {
          "ui:options": {
            onChange: (value) => {
              !this.formData?.has_cif &&
                this.dropdownReset({
                  account_type_id: value,
                  account_scheme_id: null,
                });
            },
          },
        },

        account_scheme_id: {
          // "ui:widget": "CascadeDropdown",
          // "ui:options": {
          //   getOptions: (formData) =>
          //     this.filterOptionsByAccount("scheme_type", formData),
          // },
        },
        screening: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:options": {
            disableButton: (formData) => {
              let requiredFields = jsonSchema.required || [];

              const allFilled = requiredFields.every((field) => {
                const value = formData?.[field];

                return value !== undefined && value !== null && value !== "";
              });

              const isTrue = !allFilled;

              return this.form_status?.includes("init") && isTrue;
            },
            onClick: () => {
              this.fetchCorporateScreening();
            },
          },
        },

        screening_card: {
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
                screening_card: tableData,
              }));
            },
            actionHandlers: {
              view: (record) => setIsModalVisible(true),
            },
          },
        },

        approval_status: {
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval") ||
            this.form_status?.includes("Completed")
          ),
          "ui:widget":
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval") ||
            this.form_status?.includes("Completed")
              ? "SelectWidget"
              : "hidden",
        },
        approval_remarks: {
          "ui:disabled": !(
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval") ||
            this.form_status?.includes("Completed")
          ),
          "ui:widget":
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval") ||
            this.form_status?.includes("Completed")
              ? "textarea"
              : "hidden",
          "ui:options": {
            rows: 5,
          },
        },

        registration_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:options": {
            name: "registration_date_ad",
            enforceAgeRestriction: false,
            validAge: 0,
            disableFutureDates: true,
            maximumDate: () => {
              const minDateValue = this.moment().format("YYYY-MM-DD");
              return minDateValue;
            },
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "registration_date_ad"
              );
            },
          },
        },
        registration_date_bs: {
          "ui:widget": "NepaliDatePickerR",
          "ui:options": {
            enforceAgeRestriction: true,
            name: "registration_date_bs",
            disableFutureDates: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "registration_date_bs"
              );
            },
          },
        },

        registration_expiry_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:options": {
            name: "registration_expiry_date_ad",
            enforceAgeRestriction: false,
            minDate: 0,
            enableFutureDates: true,
            maximumDate: () => {
              const minDateValue = this.moment().format("YYYY-MM-DD");
              return minDateValue;
            },
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "registration_expiry_date_ad"
              );
            },
          },
        },
        registration_expiry_date_bs: {
          "ui:widget": "NepaliDatePickerR",
          "ui:options": {
            name: "registration_expiry_date_bs",
            enforceAgeRestriction: false,
            minDate: 0,
            enableFutureDates: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "registration_expiry_date_bs"
              );
            },
          },
        },

        income_year: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: () => this.getNepaliYears(),
          },
        },
        license_details: {
          "ui:options": {
            orderable: false,
            addable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("Completed")
            ),
            removable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("Completed")
            ),
          },
          items: {
            "ui:ObjectFieldTemplate": ObjectFieldTemplate,
            "ui:order": [
              "license_purpose",
              "license_number",
              "license_issuing_authority",
              "license_issuing_date_ad",
              "license_issuing_date_bs",
              "license_expiry_date_ad",
              "has_no_expiry_date",
              "license_expiry_date_bs",
            ],
            connectedPairs: [["license_expiry_date_ad", "has_no_expiry_date"]],
            license_issuing_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:options": {
                name: "license_issuing_date_ad",
                enforceAgeRestriction: false,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData) => {
                  const minDateValue = formData?.license_details?.map((item) =>
                    this.moment(formData?.registration_date_ad).format(
                      "YYYY-MM-DD"
                    )
                  );
                  return minDateValue && minDateValue[0];
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    true,
                    "license_issuing_date_ad",
                    "license_details",
                    index ? index : 0
                  );
                },
              },
            },
            license_issuing_date_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:options": {
                name: "license_issuing_date_bs",
                enforceAgeRestriction: false,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData) => {
                  const minDateValue = formData?.license_details?.map(
                    (item) =>
                      formData?.registration_date_ad &&
                      !formData?.source === "ocr" &&
                      this.NepaliDate.parseEnglishDate(
                        this.moment(formData?.registration_date_ad).format(
                          "YYYY-MM-DD"
                        ),

                        "YYYY-MM-DD"
                      ).format("YYYY-MM-DD")
                  );

                  return minDateValue && minDateValue[0];
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    true,
                    "license_issuing_date_bs",
                    "license_details",
                    index ? index : 0
                  );
                },
              },
            },
            license_expiry_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:options": {
                enforceAgeRestriction: false,
                minDate: 0,
                enableFutureDates: true,
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    true,
                    "license_expiry_date_ad",
                    "license_details",
                    index ? index : 0
                  );
                },
              },
            },
            has_no_expiry_date: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
            },
            license_expiry_date_bs: {
              "ui:widget": "NepaliDatePickerR",
              "ui:options": {
                enforceAgeRestriction: false,
                minDate: 0,
                enableFutureDates: true,
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    true,
                    "license_expiry_date_bs",
                    "license_details",
                    index ? index : 0
                  );
                },
              },
            },
          },
        },
        pan_number: {
          "ui:options": {
            maxLength: 9,
            onBlurCapture: (events) =>
              setFormData(() => {
                this.setFormData((prevFormData) => ({
                  ...prevFormData,
                  dedup_corporate_pan_number: events?.target?.value,
                }));
              }, 600),
          },
        },
        pan_issue_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:options": {
            name: "pan_issue_date_ad",
            enforceAgeRestriction: false,
            validAge: 0,
            disableFutureDates: true,
            minimumDate: (formData) => {
              const minDateValue = this.moment(
                formData?.registration_date_ad
              ).format("YYYY-MM-DD");
              return minDateValue;
            },
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "pan_issue_date_ad"
              );
            },
          },
        },
        pan_issue_date_bs: {
          "ui:widget": "NepaliDatePickerR",
          "ui:options": {
            enforceAgeRestriction: true,
            name: "pan_issue_date_bs",
            disableFutureDates: true,
            minimumDate: (formData) => {
              const minDateValue = this.moment(
                formData?.registration_date_ad
              ).format("YYYY-MM-DD");
              return minDateValue;
            },
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "pan_issue_date_bs"
              );
            },
          },
        },

        registration_province: {
          "ui:options": {
            onChange: (value) =>
              this.dropdownReset({
                registration_province: value,
                registration_district: null,
                registration_municipality: null,
              }),
          },
        },
        registration_district: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "districts",
                formData?.registration_province
              );
            },
            onChange: (value) =>
              this.dropdownReset({
                registration_district: value,
                registration_municipality: null,
              }),
          },
        },
        registration_municipality: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions(
                "local_bodies",
                formData?.registration_district
              );
            },
          },
        },

        same_as_registered_address: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,

          "ui:options": {
            setDisabled: (formData) => {
              const disable =
                !this.formData?.registration_country?.includes("NP");
              return disable;
            },
            onChange: sameAsRegisteredAddressChange,
            preserveValue: true,
          },
        },
        mailing_country: {
          "ui:options": {
            setDisabled: (formData) =>
              formData?.same_as_registered_address ||
              formData?.registration_country !== "NP"
                ? true
                : false,
          },
        },
        mailing_province: {
          "ui:options": {
            setDisabled: (formData) => formData?.same_as_registered_address,
            onChange: (value) =>
              this.dropdownReset({
                mailing_province: value,
                mailing_district: null,
                mailing_municipality: null,
              }),
          },
        },
        mailing_district: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            setDisabled: (formData) => formData?.same_as_registered_address,
            getOptions: (formData) => {
              return this.filterOptions(
                "districts",
                formData?.mailing_province
              );
            },
            onChange: (value) =>
              this.dropdownReset({
                mailing_district: value,
                mailing_municipality: null,
              }),
          },
        },
        mailing_municipality: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            setDisabled: (formData) => formData?.same_as_registered_address,
            getOptions: (formData) => {
              return this.filterOptions(
                "local_bodies",
                formData?.mailing_district
              );
            },
          },
        },
        mailing_ward_number: {
          "ui:options": {
            setDisabled: (formData) => formData?.same_as_registered_address,
          },
        },
        mailing_street_name: {
          "ui:options": {
            setDisabled: (formData) => formData?.same_as_registered_address,
          },
        },
        mailing_town: {
          "ui:options": {
            setDisabled: (formData) => formData?.same_as_registered_address,
          },
        },
        mailing_house_number: {
          "ui:options": {
            setDisabled: (formData) => formData?.same_as_registered_address,
          },
        },
        id_type_details: {
          "ui:options": {
            orderable: false,
            addable: false,
            removable: false,
          },
          items: {
            "ui:order": [
              "id_type_id",
              "nationality",
              "identification_number",
              "issue_country",
              "issued_district",
              "issued_district_text",
              "issuing_authority",
              "issuing_authority_text",
              "id_issued_date_ad",
              "id_issued_date_bs",
              "id_expiry_date_ad",
              "id_expiry_date_bs",
              "visa_issued_date_ad",
              "visa_expiry_date_ad",
              "national_id_number",
              "comment",
              "citizenship_number",
              "disable",
              "removable",
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
                getOptions: (formData, index) => {
                  const filterOption = this.filterOptions(
                    "corporate_document_types"
                  );
                  return filterOption || [];
                },
              },
            },

            issue_country: {
              "ui:options": {},
            },

            comment: {
              "ui:widget": "textarea",
              "ui:options": {
                rows: 5,
              },
            },

            id_issued_date_ad: {
              "ui:widget": widgets.CustomDatePicker,

              "ui:placeholder": "Select Issued Date (A.D)",

              "ui:options": {
                name: "id_issued_date_ad",

                enforceAgeRestriction: false,

                validAge: 0,

                disableFutureDates: true,

                minimumDate: (formData) => {
                  const minDateValue = formData?.id_type_details?.map((item) =>
                    this.moment(formData?.registration_date_ad).format(
                      "YYYY-MM-DD"
                    )
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

              "ui:options": {
                enforceAgeRestriction: true,

                name: "id_issued_date_bs",

                disableFutureDates: true,

                minimumDate: (formData) => {
                  const minDateValue = formData?.id_type_details?.map(
                    (item) =>
                      formData?.registration_date_ad &&
                      !formData?.source === "ocr" &&
                      this.NepaliDate.parseEnglishDate(
                        this.moment(formData?.registration_date_ad).format(
                          "YYYY-MM-DD"
                        ),

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

              "ui:options": {
                //   minDate: this.moment().subtract(100, "years"),

                //   maxDate: this.moment().subtract(18, "years"),

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

            issued_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  const identification =
                    formData?.id_type_details?.[index]?.id_type_id;
                  return this.filterOptions(
                    identification === "PP" ||
                      identification === "4fcd4a69-59f3-4de2-986f-c56e07d223cd"
                      ? "country_and_district"
                      : "districts"
                  );
                },
              },
            },
            issued_district_text: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  const identification =
                    formData?.id_type_details?.[index]?.id_type_id;
                  return this.filterOptions(
                    identification === "PP" ||
                      identification === "4fcd4a69-59f3-4de2-986f-c56e07d223cd"
                      ? "country_and_district"
                      : "countries"
                  );
                },
              },
            },

            visa_issued_date_ad: {
              "ui:widget": widgets.CustomDatePicker,

              "ui:placeholder": "Select Visa Issued Date (A.D)",

              "ui:options": {
                enforceAgeRestriction: false,

                disableFutureDates: true,

                validAge: 0,

                // minimumDate: (formData) => {
                //   const minDateValue = formData?.id_type_details?.map((item) =>
                //     this.moment(item?.id_issued_date_ad).format("YYYY-MM-DD")
                //   );

                //   return minDateValue && minDateValue[0];
                // },
              },
            },

            visa_expiry_date_ad: {
              "ui:widget": widgets.CustomDatePicker,

              "ui:placeholder": "Select Visa Expiry Date (A.D)",

              "ui:options": {
                enforceAgeRestriction: false,

                minDate: 0,

                enableFutureDates: true,
              },
            },

            visa_type: {
              "ui:placeholder": "Select Visa Type",
            },
          },
        },
        contact_details: {
          "ui:options": {
            orderable: false,
            addable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("Completed")
            ),
            removable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval") ||
              this.form_status?.includes("Completed")
            ),
          },
          items: {
            "ui:ObjectFieldTemplate": ObjectFieldTemplate,
            "ui:order": [
              "key_contact_person",
              "email",
              "contact_type",
              "phone_country_code",
              "phone_number",
              "mobile_country_code",
              "mobile_number",
            ],
            mobile_number: {
              "ui:options": {
                maxLength: 12,
              },
            },
            phone_number: {
              "ui:options": {
                maxLength: 9,
              },
            },
            area_code: {
              "ui:options": {
                maxLength: 3,
              },
            },
          },
        },
      };
    }
  }
  window.UISchemaFactory = UISchemaFactory;
})();
