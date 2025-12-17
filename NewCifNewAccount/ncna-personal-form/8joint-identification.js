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
    customValidate(formData, errors, uiSchema) {
      const municipalityTitle = this.optionsData["local_bodies"]?.find(
        (item) => item?.id === formData?.permanent_municipality
      )?.title;

      const clonedFormData = JSON.parse(JSON.stringify(formData));
      clonedFormData.permanent_municipality = municipalityTitle;
      this.functionGroup?.validateCombinedLength(clonedFormData, errors, {
        type: "permanent",
        fieldNames: {
          town: "town",
          street: "street_name",
          postalCode: "municipality",
        },
      });

      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "permanent",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });
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

      if (addHasUncheckedView) {
        errors?.personal_screening_data?.addError(
          "View all Screening Data To Continue"
        );
      }

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
    // FUNCTION TO SPLIT FULL NAME
    splitFullName(fullName) {
      const parts = fullName?.trim()?.split(/\s+/); // Split by spaces
      let firstName = parts[0] || "";
      let middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
      let lastName = parts.length > 1 ? parts[parts.length - 1] : "";

      return { firstName, middleName, lastName };
    }

    async handleSchemeCheck(payload) {
      try {
        if (
          !(payload.account_scheme_id && payload.cif_number && payload.currency)
        )
          return;
        else {
          await this.axios.post(
            `${this.mainRouteURL}/external-api/scheme-check`,
            {
              scheme: payload.account_scheme_id,
              cif_number: payload.cif_number,
              currency: payload.currency,
            }
          );
          return;
        }
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
      }
    }

    convertToArray(value, key, parentKey, comparisionKey) {
      setTimeout(() => {
        this.setFormData((prevData) => {
          if (!prevData[parentKey]) return prevData;

          // const previousData = {
          //   ...prevData,
          //   id_type_details:
          //     prevData?.nationality ===
          //       "NP" ||
          //     prevData?.nationality === "IN"
          //       ? [{}]
          //       : [
          //           {
          //             id_type_id: "PP",
          //           },
          //           {
          //             removable: false,
          //             id_type_id: "TRDOC",
          //           },
          //         ],
          // };

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

    async handleSchemeChange() {
      const schemaDependenciesMap = await Object.fromEntries(
        this.schemaConditions?.schemaDependencies?.map((entry) => [
          Object.keys(entry)[0],
          Object.values(entry)[0],
        ]) || []
      );
      const findCBSCode = (id) => {
        for (const key in this.optionsData) {
          const match =
            this.optionsData[key]?.length > 0 &&
            this.optionsData[key]?.find(
              (item) => item?.fg_code || item?.cbs_code || item?.id === id
            );
          if (match) return match.cbs_code;
        }
        return null;
      };

      const accountCBSCode = await findCBSCode(this.formData.account_scheme_id);

      const schemaDependentValues =
        (await schemaDependenciesMap[accountCBSCode]) || {};

      const resolveValue = (key, value) => {
        if (!value) return value;

        const optionSet = this.optionsData[key] || [];
        const match = optionSet.find((item) =>
          item.cbs_code ? item.cbs_code === value : item.title === value
        );

        return match ? match.id : value;
      };

      await this.setFormData((prevFormData) => ({
        ...prevFormData,
        gender: schemaDependentValues?.gender || this.formData?.gender || null,
        // occupation_type: resolveValue(
        //   "occupations",
        //   schemaDependentValues?.occupation_type ||
        //     this.formData?.occupation_type ||
        //     null
        // ),
        nationality: resolveValue(
          "nationalities",
          schemaDependentValues?.nationality ||
            this.formData?.nationality ||
            null
        ),
        // source_of_income: resolveValue(
        //   "income_sources",
        //   schemaDependentValues?.source_of_income ||
        //     this.formData?.source_of_income ||
        //     null
        // ),
        business_type: resolveValue(
          "business_type",
          schemaDependentValues?.business_type ||
            this.formData?.business_type ||
            null
        ),
        province: resolveValue(
          "provinces",
          schemaDependentValues?.province || this.formData?.province || null
        ),
      }));

      await this.setUiSchema((prevSchema) => ({
        ...prevSchema,
        date_of_birth_ad: {
          ...prevSchema?.date_of_birth_ad,
          "ui:options": {
            ...prevSchema?.date_of_birth_ad?.["ui:options"],
            validAge: this.formData?.is_minor_account
              ? 0
              : schemaDependentValues?.date_of_birth_ad || 18,
          },
        },
        date_of_birth_bs: {
          ...prevSchema?.date_of_birth_bs,
          "ui:options": {
            ...prevSchema?.date_of_birth_bs?.["ui:options"],
            validAge: this.formData?.is_minor_account
              ? 0
              : schemaDependentValues?.date_of_birth_bs || 18,
            minAge: !this.formData?.is_minor_account && 0,
            maxAge: this.formData?.is_minor_account && 18,
          },
        },
      }));
    }

    async calculateRisk(value) {
      try {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          calculate_risk: {
            ...prevUiSchema.calculate_risk,
            "ui:options": {
              ...prevUiSchema.calculate_risk?.["ui:options"],
              show_loader: true,
            },
          },
        }));
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...this.formData,
            category: "individual",
            id: this.case_id,
          }
        );

        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data;

        this.setFormData((prevData) => ({
          ...prevData,
          risk_level: resp?.risk_level,
          risk_score: resp?.risk_score,
          risk_message: resp?.risk_message,
        }));

        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          isDisabled: false,
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
          calculate_risk: {
            ...prevUiSchema.calculate_risk,
            "ui:options": {
              ...prevUiSchema.calculate_risk?.["ui:options"],
              show_loader: false,
            },
          },
        }));
      }
    }

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

      const next_step = schemaConditions?.accountInfo?.find(
        (item) => item?.account_type === this.formData?.account_info
      )?.step_slug;

      if (next_step) {
        this.setNextStep(next_step);
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
            flatEntry[key] = rest[key].items.map((item) => ({
              value: item,
              confirmation: item.confirmation || null,
            }));
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

    async fetchPersonalInfoScreening() {
      this.addLoader("personal_info_screening", true);
      try {
        if (!this.formData?.first_name?.trim()) {
          this.toast.error("Please enter a First Name");
          return;
        }
        let payload = {
          first_name: this.formData.first_name,
          middle_name: this.formData.middle_name,
          last_name: this.formData.last_name,
          father_name: this.formData.father_name,
          identification_number: this.formData.identification_number,
          blacklist_min_score: Number(this.formData.blacklist_min_score),
          sanction_min_score: Number(this.formData.sanction_min_score),
          pep_min_score: Number(this.formData.pep_min_score),
          adverse_media_min_score: Number(
            this.formData.adverse_media_min_score
          ),
          max_results: Number(this.formData.max_result),
        };

        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/screening-check`,
          payload
        );

        const responseData =
          response?.data?.data?.realTimeScreeningResult?.responseData;
        const responseD = response?.data?.data?.realTimeScreeningResult;
        const screeningLists = responseData?.ResultedRecords;
        const data = screeningLists?.map((item) => ({
          ...item,
          source: item?.listName.includes("LNACCUITYLIST_PEP")
            ? "pep"
            : item?.listName.includes("LNACCUITYLIST_GWL")
            ? "sanction"
            : item?.listName.includes("KSKLLIST")
            ? "blacklist"
            : item?.listName.includes("LNACCUITYLIST_EDD")
            ? "adverse_media"
            : item?.listName.includes("NBAPEPLIST")
            ? "pep_nba"
            : item?.listName.includes("BLOCKLIST")
            ? "blocklist"
            : item?.listName,
          listIdDetails: [{ ...item?.listIdDetails }],
        }));

        this.setFormData((prevData) => ({
          ...prevData,
          personal_screening_data: this.preprocessData(data),
          screening_ref_code: responseD.uniqueRequestId,
        }));
        this.setRenderFormKey((prev) => prev + 1);
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
        this.addLoader("personal_info_screening", false);
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
        issued_district_text: "countries",
        issued_district: "districts",
        issuing_authority: "issuing_authorities",
        family_member_relation: "relationships",
        occupation_type: "occupations",
        designation: "corporate_relation",
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
        existing_risk_rating: "risk_categories",
        marital_status: "marital_status",
        customer_type_id: "customer_types",
        constitution_code_id: "constitution_types",
        currency: "currencies",
        national_id_issuing_authority: "issuing_authorities",
        national_id_issue_place: "districts",
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
      const next_step = this.schemaConditions?.accountInfo?.find(
        (item) => item?.account_type === this.formData?.account_info
      )?.step_slug;

      next_step && this.setNextStep(next_step);

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
        "relation_to_nominee",
        "dedup_identification",
        "national_id_issuing_authority",
        "existing_risk_rating",
        "marital_status",
        "customer_type_id",
        "constitution_code_id",
        "currency",
        "source_of_income",
        "issued_district_text",
        "designation",
        "national_id_issue_place",
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
        cif_enquiry: {
          ...prevUiSchema.cif_enquiry,
          "ui:disabled": true,
          "ui:options": {
            ...prevUiSchema.cif_enquiry["ui:options"],
            show_loader: true,
          },
        },
      }));
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number: cifId ?? this.formData.cif_number,
            form_title: "joint_info",
            id: this.case_id,
            is_minor: this.formData?.is_minor_account,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data;

        this.setFormData((prevData) => ({
          ...prevData,
          ...resp,
          account_info: prevData?.account_info,
          has_cif: prevData?.has_cif,
          cif_number: prevData?.cif_number,
          cif_data: resp,
          ...(resp?.national_id_number && {
            national_id_number: this.functionGroup.nidFormat(
              resp?.national_id_number
            ),
          }),

          date_of_birth_bs: resp?.date_of_birth_ad
            ? this.adToBs(resp?.date_of_birth_ad)
            : "",
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
          showButton:
            error.response?.data?.message
              .toLowerCase()
              ?.includes("incomplete") && true,
          buttonName:
            error.response?.data?.message
              .toLowerCase()
              ?.includes("incomplete") && "Redirect to BPM",
          buttonUrl:
            error.response?.data?.message
              .toLowerCase()
              ?.includes("incomplete") && "",
        });
        return {};
      } finally {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          cif_enquiry: {
            ...prevUiSchema.cif_enquiry,
            "ui:disabled": false,
            "ui:options": {
              ...prevUiSchema.cif_enquiry["ui:options"],
              show_loader: false,
            },
          },
        }));
      }
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

    async getDedupCheck() {
      const nonClearableField = [
        "is_minor_account",
        "has_cif",
        "cif_number",
        "first_name",
        "middle_name",
        "last_name",
        "last_name_not_available",
        "father_name",
        "dedup_id_number",
        "dedup_identification",
        "date_of_birth_ad",
        "date_of_birth_bs",
        "collect",
        "account_info",
        "account_type_id",
        "account_scheme_id",
        "currency",
        "nationality",
        "customer_type_id",
        "customer_status",
        ...(this.formData?.account_scheme_id ===
        "e1d843a7-8062-4190-a26d-846a85b0f4ad"
          ? ["gender"]
          : []),
        ...([
          "b7a9d971-2596-408f-ab7f-60c657549da1",
          "945b7138-18dc-418c-9de1-2a79df23947f",
          "dc396a31-7c87-42d6-b208-ae973cecb12b",
        ].includes(this.formData?.account_scheme_id)
          ? ["occupation_type"]
          : []),
      ];
      !(this.formData?.has_cif || this.formData?.source === "ocr") &&
        this.formDataCleaner(nonClearableField);
      if (!this.formData?.first_name) {
        this.toast.error("Enter name for dedup module");
        return;
      }
      this.addLoader("dedup_check", true);

      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check`,
          {
            first_name: this.formData.first_name,
            middle_name: this.formData.middle_name,
            last_name: this.formData.last_name,
            father_name: this.formData.father_name,
            id_number: this.formData.dedup_id_number,
            document_type: this.formData.dedup_identification,
            citizenship_number: null,
            dob_ad: this.formData.date_of_birth_ad,
            dob_bs: this.formData.date_of_birth_bs,
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
        this.addLoader("dedup_check", false);
      }
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
      !this.formData?.case_status && (this.nationalityChanged = true);
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
                  same_as_permanent: value,
                  current_country: "NP",
                  current_province: "",
                  current_district: "",
                  current_municipality: "",
                  current_ward_number: "",
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
          "nid_reset",
          "id_type_details",
          "id_type_id",
          "identification_number",
          "issue_country",
          "citizenship_number",

          "is_minor_account",
          "has_cif",
          "cif_number",
          "cif_enquiry",
          "account_info",
          "account_type_id",
          "nationality",
          "currency",
          "account_scheme_id",
          "pension",
          "staff_id",
          "dmat_number",
          "ssn",
          "customer_type_id",
          "customer_status",
          "collect",
          "first_name",
          "middle_name",
          "last_name",
          "last_name_not_available",
          "father_name",
          "date_of_birth_ad",
          "date_of_birth_bs",
          "dedup_identification",
          "dedup_id_number",
          "extra_gap",
          "dedup_check",
          "dedup_module_data",

          "salutation",
          "gender",
          "marital_status",

          "email",
          "email_not_available",
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

          "first_name",
          "middle_name",
          "last_name",
          "nationality",

          "occupation_type",
          "source_of_income",
          "occupation_detail",

          "business_type",
          "has_nominee",

          "nominee_full_name",
          "relation_to_nominee",
          "nominee_father_name",
          "nominee_grandfather_name",
          "nominee_contact_number",

          "personal_info_screening",
          "screening_filter",
          "personal_screening_data",
          "screening_ref_code",

          "declared_anticipated_annual_transaction",
          "expected_anticipated_annual_transaction",
          "number_of_transaction",
          "yearly_income",
          "transaction_justification",
          "transaction_fund_details",

          "pep",
          "pep_category",
          "pep_declaration",
          "family_pep_declaration",
          "adverse_media",
          "adverse_category",
          "entitled_with_fund",
          "existing_risk_rating",
          "loan_status",
          "is_blacklisted",
          "customer_introduce_by",
          "introducer_account_number",
          "customer_name",
          "employee_id",
          "met_in_person",
          "blacklist_min_score",
          "sanction_min_score",
          "pep_min_score",
          "adverse_media_min_score",
          "max_result",
          "screening_ref_number",
          "external_cdd_id",
          "risk_level",
          "calculate_risk",
          "risk_score",
          "cif_data",
          "source",
        ],

        first_name: {
          "ui:widget": "hidden",
        },
        middle_name: {
          "ui:widget": "hidden",
        },
        last_name: {
          "ui:widget": "hidden",
        },
        source: {
          "ui:widget": "hidden",
        },
        is_customer_disabled: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
        },
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
        nid_verify: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonPopupWidget"
            : "hidden",
          "ui:label": false,
          "ui:classNames": "mt-2 w-100",
          // "ui:options": {
          //   disableButton: (formData) => !formData?.national_id_number,
          //   buttonClassName: "w-100",
          //   onClick: async (formData) => {
          //     this.addLoader("nid_verify", true);
          //     let nidVerifiedValue = "No";
          //     try {
          //       const response = await this.axios.post(
          //         `${this.mainRouteURL}/external-api/verify-nid`,
          //         {
          //           nin: formData?.national_id_number,
          //           first_name: formData?.first_name,
          //           last_name: formData?.last_name,
          //           middle_name: formData?.middle_name,
          //           date_of_birth: formData?.date_of_birth_ad,
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
          //       this.addLoader("nid_verify", false);
          //       this.setFormData((prevForm) => ({
          //         ...prevForm,
          //         nid_verified: nidVerifiedValue,
          //       }));
          //     }
          //   },
          // },
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
        cif_data: {
          "ui:widget": "hidden",
        },
        connectedPairs: [
          ["lastname", "last_name_not_available"],
          ["email", "email_not_available"],
        ],
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
        screening_ref_code: {
          "ui:widget": "hidden",
          "ui:label": false,
        },

        customer_type_id: {},

        is_minor_account: {
          "ui:widget": "hidden",
          // "ui:widget": "CustomCheckBoxWidget",
          "ui:classNames": "d-flex align-items-center",
          "ui:label": false,
          "ui:options": {
            onChange: (value) => {
              this.setUiSchema((prevSchema) => ({
                ...prevSchema,
                date_of_birth_ad: {
                  ...prevSchema?.date_of_birth_ad,
                  "ui:options": {
                    ...prevSchema?.date_of_birth_ad["ui:options"],
                    minAge: value ? 18 : 0,
                    disableFutureDates: value,
                    validAge: !value ? 18 : 0,
                  },
                },
                date_of_birth_bs: {
                  ...prevSchema?.date_of_birth_bs,
                  "ui:options": {
                    ...prevSchema?.date_of_birth_bs["ui:options"],
                    minAge: !value && 0,
                    maxAge: value && 18,
                    disableFutureDates: value,
                    validAge: !value ? 18 : 0,
                  },
                },
              }));

              this.dropdownReset({
                is_minor_account: value,
                marital_status: value ? "UNMAR" : "",
                date_of_birth_ad: "",
                date_of_birth_bs: "",
                dedup_identification: value
                  ? null
                  : this.formData?.nationality === "NP"
                  ? "CTZN"
                  : null,
                id_type_details: [{}],
                // date_of_birth_ad: value
                //   ? this.moment().subtract(1, "day").format("YYYY-MM-DD")
                //   : this.moment().subtract(18, "years").format("YYYY-MM-DD"),
                // date_of_birth_bs: value
                //   ? this.NepaliDate.parseEnglishDate(
                //       this.moment().subtract(1, "day").format("YYYY-MM-DD"),
                //       "YYYY-MM-DD"
                //     ).format("YYYY-MM-DD")
                //   : this.NepaliDate.parseEnglishDate(
                //       this.moment(formData?.date_of_birth_ad)
                //         .subtract(18, "years")
                //         .format("YYYY-MM-DD"),
                //       "YYYY-MM-DD"
                //     ).format("YYYY-MM-DD"),
              });
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

        dedup_identification: {
          // "ui:widget": "CascadeDropdown",
          "ui:options": {
            setDisabled: (formData, index) =>
              !(
                formData?.nationality === "IN" || formData?.nationality === "NP"
              ),

            // getOptions: (formData) => {
            //   if (
            //     formData?.dedup_identification &&
            //     this.nationalityChanged === true
            //   ) {
            //     this.convertToArray(
            //       formData?.dedup_identification,
            //       "id_type_id",
            //       "id_type_details",
            //       ["dedup_identification", "id_type_id"]
            //     );

            //     this.nationalityChanged = false;
            //   }
            //   const d = this.functionGroup?.getRequiredDocuments(
            //     this.optionsData["multi_validation_mapping"],
            //     {
            //       nationality: formData?.nationality,
            //       account_type: formData?.is_minor_account
            //         ? "MINOR"
            //         : formData?.account_info,
            //     }
            //   );
            //   return d?.filter((doc) => !["PANR", "WPERM"].includes(doc.value));
            // },

            onChange: async (value) => {
              await setTimeout(
                () =>
                  this.setFormData((prev) => ({
                    ...prev,
                    id_type_details: [],
                    dedup_id_number: null,
                  })),
                100
              );
              await this.convertToArray(
                value,
                "id_type_id",
                "id_type_details",
                ["dedup_identification", "id_type_id"]
              );
            },
          },
        },
        dedup_id_number: {
          "ui:options": {
            onChange: (value) => {
              this.convertToArray(
                value,
                "identification_number",
                "id_type_details",
                ["dedup_identification", "id_type_id"]
              );
            },
          },
        },

        father_name: {
          "ui:options": {
            onChange: (value) => {
              this.convertToArray(
                value,
                "family_member_full_name",
                "family_information"
              );
            },
          },
        },

        dedup_check: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:classNames":
            "d-flex justify-content-end align-items-end h-100 my-1",
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
            onClick: () => {
              this.getDedupCheck();
            },
          },
        },
        dedup_module_data: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
          showCheckbox: false,
          showViewedColumn: false,
          fixedActionsColumn: true,
          "ui:options": {
            onCheckboxChange: (tableData, category, checked) => {
              this.setFormData((prevData) => ({
                ...prevData,
                [category]: checked ? "Yes" : "No",
                dedup_module_data: tableData,
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
                      has_cif: true,
                      cif_number: record?.cif_number,
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

        account_info: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:options": {
            onChange: (value) => {
              return this.dropdownReset({
                account_type_id: value,
                account_scheme_id: null,
              });
            },
          },
        },

        risk_score: {
          "ui:widget": "hidden",
          "ui:label": false,
        },

        calculate_risk: {
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

        salutation: {
          "ui:widget": "CustomRadioWidget",
          "ui:options": {
            // getOptions: (formData) => {
            //   console.log(formData);
            //   return formData?.account_scheme_id
            //     ? this.filterOptions(
            //         "salutations",
            //         formData?.account_scheme_id ===
            //           "e1d843a7-8062-4190-a26d-846a85b0f4ad"
            //           ? formData?.account_scheme_id
            //           : formData?.is_minor_account
            //           ? "MINOR"
            //           : formData?.account_info
            //       )
            //     : this.functionGroup?.getRequiredDocuments(
            //         this.optionsData["multi_validation_mapping"],
            //         {
            //           account_info:
            //             formData?.account_scheme_id ===
            //             "e1d843a7-8062-4190-a26d-846a85b0f4ad"
            //               ? formData?.account_scheme_id
            //               : formData?.is_minor_account
            //               ? "MINOR"
            //               : formData?.account_info,
            //         }
            //       );
            // },
            onChange: (value) => {
              this.dropdownReset({
                salutation: value,
                gender:
                  this.formData?.account_scheme_id ===
                  "e1d843a7-8062-4190-a26d-846a85b0f4ad"
                    ? "535a3b2f-7e6f-4077-9359-51a451083cbc"
                    : null,
              });
            },
          },
        },
        mobile_country_code: {
          "ui:options": {
            onChange: (value) => {
              return this.dropdownReset({
                mobile_country_code: value,
                mobile_number: "",
              });
            },
          },
        },
        phone_country_code: {
          "ui:options": {
            onChange: (value) => {
              return this.dropdownReset({
                phone_country_code: value,
                phone_number: "",
              });
            },
          },
        },
        permanent_country: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                permanent_country: value,
                permanent_province: null,
                permanent_district: null,
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
          },
        },
        account_type_id: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                account_type_id: value,
                account_scheme_id: null,
              });
            },
          },
        },
        currency: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({
                account_scheme_id: null,
                customer_type_id: null,
              });

              this.handleSchemeCheck({
                cif_number: this.formData?.cif_number,
                currency: value,
                account_scheme_id: this.formData?.account_scheme_id,
              });
            },
          },
        },
        account_scheme_id: {
          // "ui:widget": "CascadeDropdown",
          // "ui:options": {
          //   getOptions: (formData) => {
          //     return this.filterMasterData("scheme_type", formData);
          //   },
          //   onChange: (value) =>
          //     setTimeout(() => {
          //       this.handleSchemeChange();
          //       this.handleSchemeCheck({
          //         cif_number: this.formData?.cif_number,
          //         currency: this.formData?.currency,
          //         account_scheme_id: value,
          //       });
          //       if (
          //         value === "dc396a31-7c87-42d6-b208-ae973cecb12b" ||
          //         value === "2c825f3c-372e-4cf4-aaa2-601652927933" ||
          //         value === "c711e377-393a-4e8b-b1df-8531bbb4184f"
          //       ) {
          //         setTimeout(
          //           () =>
          //             this.setFormData((prev) => {
          //               const items = prev?.id_type_details || [];
          //               const targetId =
          //                 value === "c711e377-393a-4e8b-b1df-8531bbb4184f"
          //                   ? "NRNID"
          //                   : "WPERM";
          //               const otherId =
          //                 value === "c711e377-393a-4e8b-b1df-8531bbb4184f"
          //                   ? "WPERM"
          //                   : "NRNID";
          //               // Filter out the otherId if it exists
          //               const filteredItems = items.filter(
          //                 (item) => item?.id_type_id !== otherId
          //               );
          //               const hasTarget = filteredItems.some(
          //                 (item) => item?.id_type_id === targetId
          //               );
          //               return {
          //                 ...prev,
          //                 id_type_details: hasTarget
          //                   ? filteredItems.map((item) => ({
          //                       ...item,
          //                     }))
          //                   : filteredItems.length === 1 &&
          //                     Object.keys(filteredItems[0]).length === 0
          //                   ? [
          //                       ...filteredItems
          //                         .filter(
          //                           (item) => Object.keys(item).length > 0
          //                         )
          //                         .map((item) => ({
          //                           ...item,
          //                           ...(item?.id_type_id && {
          //                             removable: true,
          //                           }),
          //                         })),
          //                       { id_type_id: targetId, removable: false },
          //                     ]
          //                   : filteredItems.map((item) => ({
          //                       ...item,
          //                     })),
          //                 // id_type_details: hasTarget
          //                 //   ? filteredItems.map((item) => ({
          //                 //       ...item,
          //                 //     }))
          //                 //   : [
          //                 //       ...filteredItems.map((item) => ({
          //                 //         ...item,
          //                 //         removable: true,
          //                 //       })),
          //                 //       { id_type_id: targetId, removable: false },
          //                 //     ],
          //               };
          //             }),
          //           100
          //         );
          //       } else {
          //         setTimeout(
          //           () =>
          //             this.setFormData((prev) => {
          //               const items = prev?.id_type_details || [];
          //               return {
          //                 ...prev,
          //                 id_type_details: items.map((item) => ({
          //                   ...item,
          //                   ...(item?.id_type_id && { removable: true }),
          //                 })),
          //               };
          //             }),
          //           100
          //         );
          //       }
          //       !this.formData?.has_cif &&
          //         this.dropdownReset({
          //           account_scheme_id: value,
          //           ...(this.formData?.source !== "ocr" && {
          //             salutation: null,
          //           }),
          //           ...(value === "df09a418-3847-4565-a2c1-eb261f2a8e72" && {
          //             date_of_birth_ad: "",
          //             date_of_birth_bs: "",
          //           }),
          //         });
          //     }, 100),
          // },
        },

        gender: {
          // "ui:widget": "CascadeDropdown",
          // "ui:options": {
          //   getOptions: (formData) => {
          //     return this.filterOptions("genders", formData?.salutation);
          //   },
          // },
        },
        cif_enquiry: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:classNames": "d-flex h-100 mt-5 align-items-center",
          "ui:options": {
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
                this.fetchIndividualInfoCIFDetail(null);
            },
          },
        },

        nationality: {
          "ui:widget": "hidden",
          "ui:options": {
            onChange: async (value) => {
              this.dropdownReset({
                nationality: value,
                dedup_id_number: "",
                dedup_identification:
                  value === "NP"
                    ? this.formData?.is_minor_account
                      ? null
                      : "CTZN"
                    : value === "IN"
                    ? null
                    : "PP",
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

        last_name_not_available: {
          "ui:widget": "CustomCheckBoxWidget",
          "ui:label": false,
          "ui:options": {
            onChange: (value) => handleSetNotAvailable(value, "last_name"),
          },
        },

        date_of_birth_ad: {
          "ui:widget": "hidden",
          // "ui:widget": widgets.CustomDatePicker,
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:placeholder": "Select Date of Birth (A.D)",
          "ui:options": {
            name: "date_of_birth_ad",
            enforceAgeRestriction: true,
            minAge: this.formData?.is_minor_account ? 18 : 0,
            disableFutureDates: true,
            validAge: !this.formData?.is_minor_account ? 18 : 0,
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
          "ui:widget": "hidden",
          "ui:help": "Date Format: YYYY-MM-DD",
          // "ui:widget": widgets.NepaliDatePickerR,
          "ui:options": {
            enforceAgeRestriction: true,
            name: "date_of_birth_bs",
            minAge: !this.formData?.is_minor_account && 0,
            maxAge: this.formData?.is_minor_account && 18,
            disableFutureDates: true,
            validAge: !this.formData?.is_minor_account ? 18 : 0,
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
                permanent_district: "",
                permanent_municipality: "",
                permanent_ward_number: "",
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
                permanent_municipality: "",
                permanent_ward_number: "",
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
                  const minDateValue = formData?.id_type_details?.map((item) =>
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
                  const minDateValue = formData?.id_type_details?.map(
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
        occupation_type: {
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
                occupation_type: value,
                source_of_income: this.optionsData["occupation_rule"]?.[
                  `source_of_income_list`
                ]?.find((item) => item?.cascade_id?.includes(value))?.id,
              }),
          },
        },

        source_of_income: {
          // "ui:widget": "CascadeDropdown",
          "ui:options": {
            // getOptions: (formData) => {
            //   return this.filterOptionsOccupation(
            //     "occupation_rule",
            //     "source_of_income_list",
            //     formData?.occupation_type
            //   );
            // },
          },
        },

        occupation_detail: {
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
            business_type: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   getOptions: (formData) => {
              //     const filteredData = this.filterOptionsOccupation(
              //       "occupation_rule",
              //       "business_type_list",
              //       formData?.occupation_type
              //     );
              //     return [
              //       ...filteredData,
              //       { label: "Others", value: "others" },
              //     ];
              //   },
              // },
            },
          },
        },

        family_information: {
          "ui:widget": "EditableTableWidget",
          "ui:label": false,
          "ui:hideLabel": true,

          "ui:options": {
            addable: false,
            orderable: false,
            removable: false,
            fieldKeys: ["family_member_relation"],
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
                  this.form_status.includes("init") ||
                  this.form_status.includes("update")
                    ? formData?.family_information?.[index ?? 0]
                        ?.family_member_relation === "FATHE" &&
                      formData?.father_name
                      ? true
                      : false
                    : true,
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

              return this.form_status?.includes("init") && !allFilled;
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
          "ui:classNames": "my-1",
          "ui:options": {
            block: true,
            disableButton: (formData) => {
              let requiredFields =
                [
                  "first_name",
                  "last_name",
                  "father_name",
                  "date_of_birth_ad",
                  "date_of_birth_bs",
                  "dedup_identification",
                  "dedup_id_number",
                  "collect",
                  "account_info",
                  "account_type_id",
                  "account_scheme_id",
                  "currency",
                  "salutation",
                  "gender",
                  "marital_status",
                  "nationality",
                  "customer_type_id",
                  "customer_status",
                ] || [];
              const allFilled = requiredFields.every((field) => {
                const value = formData?.[field];
                return value !== undefined && value !== null && value !== "";
              });

              return this.form_status?.includes("init") && !allFilled;
            },
            onClick: () => {
              this.fetchPersonalInfoScreening();
              setFormData((prevData) => ({
                ...prevData,
              }));
            },
          },
        },
        personal_screening_data: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
          showCheckbox: true,
          showActionText: true,
          showFooter: true,
          showViewedColumn: false,
          fixedActionsColumn: true,
          "ui:options": {
            onCheckboxChange: (tableData, category, checked) => {
              const categoryKey =
                category === "pep_nba"
                  ? "pep"
                  : category === "sanction_moha"
                  ? "sanction"
                  : category;

              // check if any item in the array has isChecked true
              const hasChecked = tableData[categoryKey]?.some(
                (item) => item.isChecked
              );

              this.setFormData((prevData) => ({
                ...prevData,
                [categoryKey]: hasChecked ? "Yes" : "No",
                personal_screening_data: tableData,
              }));
            },
            actionHandlers: {
              view: (record) => setIsModalVisible(true),
            },
          },
        },

        current_country: {
          "ui:widget": "hidden",
        },

        current_province: {
          "ui:widget": "hidden",
        },

        current_district: {
          "ui:widget": "hidden",
        },
        current_municipality: {
          "ui:widget": "hidden",
        },
        current_ward_number: {
          "ui:widget": "hidden",
        },
        current_street_name: {
          "ui:widget": "hidden",
        },
        current_town: {
          "ui:widget": "hidden",
        },
        current_house_number: {
          "ui:widget": "hidden",
        },
        current_outside_town: {
          "ui:widget": "hidden",
        },
        current_outside_street_name: {
          "ui:widget": "hidden",
        },
        current_postal_code: {
          "ui:widget": "hidden",
        },

        screening_card: {
          "ui:widget": "ScreeningReportCard",
          "ui:label": false,
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
