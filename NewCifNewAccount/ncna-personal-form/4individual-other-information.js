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
      const municipalityTitle = this.optionsData["local_bodies"]?.find(
        (item) => item?.id === formData?.permanent_municipality
      )?.title;

      const clonedFormData = JSON.parse(JSON.stringify(formData));
      clonedFormData.permanent_municipality = municipalityTitle;

      this.functionGroup?.validateCombinedLength(clonedFormData, errors, {
        type: "permanent",
        fieldNames: {
          town: "ward_number",
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
          item.cbs_code
            ? item.cbs_code === value
            : item.title?.toLowerCase() === value?.toLowerCase()
        );
        return match ? match.id : value;
      };
      await this.setFormData((prevFormData) => ({
        ...prevFormData,
        gender: resolveValue(
          "genders",
          schemaDependentValues?.gender || this.formData?.gender || null
        ),
        occupation_type: resolveValue(
          "occupation_types",
          schemaDependentValues?.occupation_type ||
            this.formData?.occupation_type ||
            null
        ),
        nationality: resolveValue(
          "nationalities",
          schemaDependentValues?.nationality ||
            this.formData?.nationality ||
            null
        ),
        source_of_income: resolveValue(
          "income_sources",
          schemaDependentValues?.source_of_income ||
            this.formData?.source_of_income ||
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
            validAge: schemaDependentValues?.date_of_birth_ad || 18,
          },
        },
        date_of_birth_bs: {
          ...prevSchema?.date_of_birth_bs,
          "ui:options": {
            ...prevSchema?.date_of_birth_bs?.["ui:options"],
            validAge: schemaDependentValues?.date_of_birth_bs || 18,
          },
        },
      }));
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

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
      this.setNextStep("personal-related-party-form");
      // const next_step = schemaConditions?.accountInfo?.find(
      //   (item) => item?.account_type === this.formData?.account_info
      // )?.step_slug;
      // if (next_step) {
      // }
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

    async fetchPersonalInfoScreening() {
      this.addLoader("personal_info_screening", true);
      try {
        const { first_name, middle_name, last_name, father_name } =
          this.formData || {};
        if (!first_name?.trim()) {
          this.toast.error("Please enter a First Name");
          return;
        }
        const payload = { first_name, middle_name, last_name, father_name };

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
            : item?.listName,
          listIdDetails: [{ ...item?.listIdDetails }],
        }));

        // if (!responseData || !screeningLists) {
        //   throw new Error("Invalid response structure from screening API.");
        // }
        this.setFormData((prev) => ({
          ...prev,
          personal_info_screening: "True",
          personal_screening_data: this.preprocessData(data),
          screening_ref_code: responseD.uniqueRequestId,
        }));

        this.setJsonSchema((prev) => ({
          ...prev,
          isDisabled: false,
        }));
      } catch (error) {
        const errMsg =
          error?.response?.data?.message ||
          error?.response?.statusText ||
          "An unexpected error occurred during screening.";

        this.setModalOpen({
          open: true,
          message: error ? errMsg : `${error || "Unknown Error"}`,
          subTitle: Array.isArray(error?.response?.data?.errors)
            ? error?.response?.data?.errors
                .map((e) => `${typeof e === "string" ? e : JSON.stringify(e)}`)
                .join("\n")
            : "",

          status: "error",
          close: "Close",
        });
        return;
      } finally {
        this.addLoader("personal_info_screening", false);
        this.setRenderFormKey((prev) => prev + 1);
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
      console.log("hell", convertedDate);
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
        locker_type: "locker_type",
        educational_qualification: "education_qualifications",
        beneficial_relationship: "relationships",
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

    findInBranch(node, key, value) {
      if (Array.isArray(node)) {
        for (const item of node) {
          const res = this.findInBranch(item, key, value);

          if (res) return res;
        }
      } else if (node && typeof node === "object") {
        if (node?.hasOwnProperty(key) && node[key] === value) {
          return node;
        }

        for (const k in node) {
          const res = this.findInBranch(node[k], key, value);

          if (res) return res;
        }
      }

      return null;
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

    async fetchIndividualInfoCIFDetail(cifId) {
      this.addLoader("cif_enquiry", true);

      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number: cifId ?? this.formData.cif_number,
            form_title: "personal_info",
            id: this.case_id,
          }
        );
        const resp = response?.data?.data;
        this.setFormData((prev) => ({
          ...resp,
          account_info: prev?.account_info,
          cif_data: resp,
          has_cif: prev?.has_cif,
          cif_number: prev?.cif_number,
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
        this.addLoader("cif_enquiry", false);
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

      const validId = "WPERM";

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

    async getDedupCheck() {
      const { account_scheme_id } = this.formData || {};

      const nonClearableField = [
        "has_cif",
        "cif_number",
        "first_name",
        "middle_name",
        "last_name",
        "last_name_not_available",
        "father_name",
        "pension",
        "staff_id",
        "dmat_number",
        "ssn",
        "dedup_id_number",
        "dedup_identification",
        "date_of_birth_ad",
        "date_of_birth_bs",
        "collect",
        "statement_collection_frequency",
        "statement_calendar_type",
        "account_info",
        "account_type_id",
        "account_scheme_id",
        "currency",
        "nationality",
        "customer_type_id",
        "customer_status",
        ...(account_scheme_id === "e1d843a7-8062-4190-a26d-846a85b0f4ad"
          ? ["gender"]
          : []),
        ...([
          "b7a9d971-2596-408f-ab7f-60c657549da1",
          "945b7138-18dc-418c-9de1-2a79df23947f",
          "dc396a31-7c87-42d6-b208-ae973cecb12b",
        ].includes(account_scheme_id)
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
        this.buttonLoader = true;

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
            dedup_check: "True",
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
      // console.log(this.formData);
      !this.formData?.case_status && (this.nationalityChanged = true);
      // this.formData?.case_status?.includes("Draft") ||
      // this.formData?.case_status?.includes("Proceed")
      //   ? (this.nationalityChanged = false)
      //   : !(
      //       this.form_status?.includes("review") ??
      //       this.form_status?.includes("approval") ??
      //       this.form_status?.includes("Completed")
      //     ) && (this.nationalityChanged = true);

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
                  same_as_permanent: value,
                  current_country: "NP", // Default
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

        // setJsonSchema((prevJson) => {
        //   const dependentKeys = [
        //     "current_country",
        //     "current_province",
        //     "current_district",
        //     "current_municipality",
        //     "current_ward_number",
        //     "current_street_name",
        //     "current_town",
        //     "current_house_number",
        //     "current_outside_town",
        //     "current_outside_street_name",
        //   ];

        //   return this.updateSchemaReadonly(prevJson, dependentKeys, value);
        // });
      };

      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,

        "ui:order": [
          "occupation_type",
          "source_of_income",
          "occupation_detail",

          "has_nominee",
          "nominee_full_name",
          "relation_to_nominee",
          "nominee_father_name",
          "nominee_grandfather_name",
          "nominee_contact_number",
          "nominee_address",
          "nominee_id_number",
          "nominee_id_issuing_authority",
          "nominee_id_issue_date_ad",
          "nominee_id_issue_date_bs",

          "beneficial_owner",
          "beneficial_name",
          "beneficial_relationship",
          "beneficial_id_number",
          "beneficial_id_issuing_authority",
          "beneficial_id_issue_date_ad",
          "beneficial_id_issue_date_bs",
          "beneficial_address",
          "beneficial_contact_number",

          "collect",
          "statement_collection_frequency",
          "statement_calendar_type",
          "need_check_book",
          "ecom",
          "dmat",
          "mero_share",
          "need_mobile_banking",
          "channel",
          "profile_type",
          "profile",
          "debit_card",
          "need_locker",
          "need_internet_banking",
          "internet_banking_service_type",

          "account_info",
          "first_name",
          "middle_name",
          "last_name",
        ],

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

        occupation_type: {
          "ui:options": {
            onChange: (value) =>
              this.dropdownReset({
                occupation_type: value,

                source_of_income: null,
              }),
          },
        },

        source_of_income: {
          "ui:widget": "CascadeDropdown",
          "ui:options": {
            getOptions: (formData) => {
              return this.filterOptions("income_sources");
            },
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

          items: {},
        },

        nominee_id_issue_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:placeholder": "Select Issued Date (A.D)",
          "ui:options": {
            enforceAgeRestriction: false,
            validAge: 0,
            name: "nominee_id_issue_date_ad",
            enforceAgeRestriction: true,
            disableFutureDates: true,

            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "nominee_id_issue_date_ad"
              );
            },
          },
        },
        nominee_id_issue_date_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            enforceAgeRestriction: true,
            validAge: 0,
            name: "nominee_id_issue_date_bs",
            enforceAgeRestriction: true,
            disableFutureDates: true,
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                false,
                "nominee_id_issue_date_bs"
              );
            },
          },
        },
        beneficial_id_issue_date_ad: {
          "ui:widget": widgets.CustomDatePicker,
          "ui:placeholder": "Select Issued Date (A.D)",
          "ui:help": "Date Format: YYYY-MM-DD",
          "ui:options": {
            enforceAgeRestriction: false,
            validAge: 0,
            name: "beneficial_id_issue_date_ad",
            onDateChange: (selectedDate) => {
              this.convertDate(
                selectedDate,
                setFormData,
                true,
                "beneficial_id_issue_date_ad"
              );
            },
          },
        },
        beneficial_id_issue_date_bs: {
          "ui:widget": widgets.NepaliDatePickerR,
          "ui:options": {
            enforceAgeRestriction: true,
            validAge: 0,
            name: "beneficial_id_issue_date_bs",
          },
          onDateChange: (selectedDate) => {
            this.convertDate(
              selectedDate,
              setFormData,
              false,
              "beneficial_id_issue_date_bs"
            );
          },
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
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
