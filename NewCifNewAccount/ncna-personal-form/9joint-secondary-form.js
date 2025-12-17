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
      this.formData = options.formData;
      this.setFormData = options.setFormData;
      this.setModalOpen = options.setModalOpen;
      this.setDivide = options.setDivide;
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
      this.jointAccountName = "";
      this.nationalityChanged = false;
      this.disabledArray = [];
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
    customValidate(formData, errors, uiSchema) {
      const cloneFormData = JSON.parse(JSON.stringify(formData));
      cloneFormData.joint_details = cloneFormData.joint_details.map(
        (jointDetails) => ({
          ...jointDetails,
          permanent_municipality: this.optionsData["local_bodies"]?.find(
            (item) => item?.id === jointDetails?.permanent_municipality
          )?.title,
        })
      );
      this.functionGroup?.validateCombinedLength(cloneFormData, errors, {
        type: "permanent",
        arrayPath: "joint_details",
        fieldNames: {
          town: "ward_number",
          street: "street_name",
          postalCode: "municipality",
        },
      });
      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "permanent",
        arrayPath: "joint_details",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });
      const jointDetails = formData?.joint_details ?? [];
      const requiredFields = ["family_member_full_name"];

      jointDetails.forEach((jointMember, index) => {
        const familyInfo = jointMember?.family_information ?? [];
        familyInfo.forEach((item, index2) => {
          requiredFields.forEach((field) => {
            const value = item?.[field]?.toString().trim();
            if (!value) {
              errors.joint_details[index] = errors.joint_details[index] || {};
              errors.joint_details[index].family_information =
                errors.joint_details[index].family_information || [];
              errors.joint_details[index].family_information[index2] =
                errors.joint_details[index].family_information[index2] || {};
              errors.joint_details[index].family_information[index2][field] =
                errors.joint_details[index].family_information[index2][field] ||
                {};

              // Clear previous errors and add only one
              errors.joint_details[index].family_information[index2][
                field
              ].addError("Required");
            }
          });
        });
      });

      if (Array.isArray(jointDetails)) {
        jointDetails.forEach((member, index) => {
          if (member?.national_id_number == "999-999-999-9") {
            return errors;
          } else if (member?.nid_verified === "No") {
            errors.joint_details ??= [];
            errors.joint_details[index] ??= {};
            errors.joint_details[index].nid_verified ??= {};
            errors.joint_details[index].nid_verified.addError?.(
              "NID must be verified."
            );
          }
        });
      }

      //Check if the User has Viewed the Application
      this.functionGroup?.checkAndAssignScreeningErrors(formData, errors);

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
    dropdownReset = async (dropdownClearObject, arrayName, index) => {
      // setTimeout(() => {
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
      // }, 100);
    };

    addPrefixToKeys(obj, prefix) {
      if (typeof obj !== "object" || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map((item) => this.addPrefixToKeys(item, prefix));
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          prefix + key,
          this.addPrefixToKeys(value, prefix),
        ])
      );
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

    async calculateRisk(index) {
      try {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          joint_details: {
            ...prevUiSchema.joint_details,
            items: {
              ...prevUiSchema.joint_details.items,
              calculate_risk: {
                ...prevUiSchema.joint_details.items.calculate_risk,
                "ui:options": {
                  ...prevUiSchema.joint_details.items.calculate_risk?.[
                    "ui:options"
                  ],
                  show_loader: true,
                },
              },
            },
          },
        }));
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...this.formData?.joint_details[index],
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
          joint_details: prevData?.joint_details?.map((item, idx) =>
            idx === index
              ? {
                  ...item,
                  calculate_risk: "true",
                  risk_level: resp?.risk_level,
                  risk_score: resp?.risk_score,
                }
              : item
          ),
        }));

        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          isDisabled: false,
        }));

        return;
      } catch (error) {
        this.toast.error(error?.response?.data?.message);
        return {};
      } finally {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          joint_details: {
            ...prevUiSchema.joint_details,
            items: {
              ...prevUiSchema.joint_details.items,
              calculate_risk: {
                ...prevUiSchema.joint_details.items.calculate_risk,
                "ui:options": {
                  ...prevUiSchema.joint_details.items.calculate_risk?.[
                    "ui:options"
                  ],
                  show_loader: false,
                },
              },
            },
          },
        }));
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
    renderForm() {
      this.setRenderFormKey((prevData) => {
        return prevData + 1;
      });
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

    convertToArray(value, key, parentKey, comparisionKey, index, arrayName) {
      setTimeout(() => {
        this.setFormData((prevData) => {
          if (!prevData[arrayName]?.[index]?.[parentKey]) return prevData;
          if (!comparisionKey || comparisionKey.length === 0) {
            return {
              ...prevData,
              [arrayName]: prevData[arrayName].map((item, arrIndex) => {
                return arrIndex === index
                  ? {
                      ...item,
                      [parentKey]: item[parentKey]?.map((data, index) =>
                        index === 0 ? { [key]: value } : data
                      ),
                    }
                  : item;
              }),
            };
          }
          const updatedArray = prevData[arrayName]?.[index]?.[parentKey].map(
            (item) => {
              if (Object.keys(item).length === 0)
                return {
                  [comparisionKey[1]]:
                    prevData[arrayName][index][comparisionKey[0]],
                  [key]: value,
                };

              if (
                comparisionKey &&
                item[comparisionKey[1]] ===
                  prevData[arrayName][index][comparisionKey[0]]
              ) {
                return { ...item, [key]: value };
              }

              return item;
            }
          );

          if (
            comparisionKey &&
            !updatedArray.some(
              (item) =>
                item[comparisionKey[1]] ===
                prevData[arrayName][index][comparisionKey[0]]
            )
          ) {
            updatedArray.push({
              [comparisionKey[1]]:
                prevData[arrayName][index][comparisionKey[0]],
              [key]: value,
            });
          }

          return {
            ...prevData,
            [arrayName]: prevData[arrayName].map((item, arrIndex) =>
              index === arrIndex ? { ...item, [parentKey]: updatedArray } : item
            ),
          };
        });
      }, 100);
    }

    async formDataCleaner(fields, index) {
      if (typeof this.formData !== "object" || this.formData === null)
        return {};

      const result = {};
      const filterData = this.formData?.joint_details?.[index ?? 0];

      // Keep only specified fields
      for (const key of fields) {
        if (key in filterData) {
          result[key] = filterData[key];
        }
      }

      // Handle family_information cleanup
      if (
        "family_information" in filterData &&
        Array.isArray(filterData.family_information) &&
        filterData.family_information.length > 0
      ) {
        const cleanedFamilyInfo = filterData.family_information.map(
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
        "id_type_details" in filterData &&
        Array.isArray(filterData.id_type_details) &&
        filterData.id_type_details.length > 0
      ) {
        const cleanedIdTypes = filterData.id_type_details.map(
          (item, index) => ({
            id_type_id: item?.id_type_id,
            identification_number: index === 0 && item?.identification_number,
            ...(item?.removable === false && { removable: item?.removable }),
          })
        );
        result.id_type_details = cleanedIdTypes;
      }

      setTimeout(
        () =>
          this.setFormData((prevData) => ({
            ...prevData,
            joint_details: prevData?.joint_details?.map((item, idx) =>
              index === idx ? result : item
            ),
          })),
        100
      );

      // this.setFormData(result)
      return result;
    }

    //GET DEDUP CHECK
    async getDedupCheck(index) {
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
        "account_info",
        "account_type_id",
        "account_scheme_id",
        "currency",
        "nationality",
        "customer_type_id",
        "customer_status",
      ];
      // !this.formData?.joint_details[index]?.has_cif &&
      //   this.formDataCleaner(nonClearableField, index);
      if (!this.formData?.joint_details[index]?.first_name) {
        this.toast.error("Enter name for dedup module");
        return;
      }
      this.setUiSchema((prevUiSchema) => ({
        ...prevUiSchema,
        joint_details: {
          ...prevUiSchema.joint_details,
          items: {
            ...prevUiSchema.joint_details.items,
            dedup_check: {
              ...prevUiSchema.joint_details.items.dedup_check,
              "ui:disabled": true,
              "ui:options": {
                ...prevUiSchema.joint_details.items.dedup_check["ui:options"],
                show_loader: true,
              },
            },
          },
        },
      }));

      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check`,
          {
            first_name: this.formData?.joint_details[index]?.first_name,
            middle_name: this.formData?.joint_details[index]?.middle_name,
            last_name: this.formData?.joint_details[index]?.last_name,
            father_name: this.formData?.joint_details[index]?.father_name,
            id_number: this.formData?.joint_details[index]?.dedup_id_number,
            citizenship_number: null,
            dob_ad: this.formData?.joint_details[index]?.date_of_birth_ad,
            dob_bs: this.formData?.joint_details[index]?.date_of_birth_bs,
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
            joint_details: prevData?.joint_details?.map((item, idx) =>
              idx === index
                ? { ...item, dedup_module_data: this.preprocessData(resp) }
                : item
            ),
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
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          joint_details: {
            ...prevUiSchema.joint_details,
            items: {
              ...prevUiSchema.joint_details.items,
              dedup_check: {
                ...prevUiSchema.joint_details.items.dedup_check,
                "ui:disabled": false,
                "ui:options": {
                  ...prevUiSchema.joint_details.items.dedup_check["ui:options"],
                  show_loader: false,
                },
              },
            },
          },
        }));
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

        return updatedFormData;
      });
      fromAdToBs && this.renderForm();
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
        family_account_holder: "relationship_status",
        relation_with_account_holder: "relationships",
        marital_status: "marital_status",
        national_id_issuing_authority: "issuing_authorities",
        national_id_issue_place: "districts",
        customer_type_id: "customer_types",
        constitution_code_id: "constitution_types",
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
      setTimeout(() => {
        this.setFormData((prevFormData) => {
          return {
            ...prevFormData,
            joint_details: prevFormData?.joint_details.map((detail, idx) =>
              idx === index[0]
                ? {
                    ...detail,
                    [arrayPath]: detail[arrayPath].map((item, i) =>
                      i === index[1]
                        ? {
                            ...item,
                            [fieldName]: value ? "Family Not Available" : "",
                          }
                        : item
                    ),
                  }
                : detail
            ),
          };
        });
        this.setUiSchema((prevUiSchema) => {
          const updatedFamilyDetails = [
            ...prevUiSchema?.joint_details?.items?.[arrayPath]["ui:options"][
              "disableSpecificKeys"
            ],
          ];

          updatedFamilyDetails[index[1]] = {
            ...updatedFamilyDetails[index[1]],
            [fieldName]: value ? index[1] : null,
          };

          return {
            ...prevUiSchema,
            joint_details: {
              ...prevUiSchema?.joint_details,
              items: {
                ...prevUiSchema?.joint_details?.items,
                [arrayPath]: {
                  ...prevUiSchema?.joint_details?.items?.[arrayPath],
                  ["ui:options"]: {
                    ...prevUiSchema?.joint_details?.items?.[arrayPath][
                      "ui:options"
                    ],
                    disableSpecificKeys: updatedFamilyDetails,
                  },
                },
              },
            },
          };
        });
      }, 100);
    }

    async initializeSchema(setJsonSchema, formData) {
      if (!this.form_status?.includes("case-init")) {
        this.setDivide(true);
      }
      if (formData?.is_minor_account) {
        this.setFormData((prevData) => {
          return {
            ...prevData,
            joint_account_name: prevData?.joint_account_name
              ? prevData?.joint_account_name
              : prevData?.first_name +
                (prevData?.middle_name ? " " + prevData.middle_name : "") +
                " " +
                prevData?.last_name,
            ...(prevData?.joint_details && {
              joint_details: prevData.joint_details.map((item) => ({
                ...item,
                is_minor_account: formData.is_minor_account,
                dedup_identification: null,
                //   item?.nationality === "NP"
                //     ? item?.is_minor_account
                //       ? null
                //       : "CTZN"
                //     : item?.nationality ===
                //       "IN"
                //     ? null
                //     : "PP",
              })),
            }),
          };
        });
      } else {
        this.setFormData((prevData) => {
          return {
            ...prevData,
            joint_account_name: prevData?.joint_account_name
              ? prevData?.joint_account_name
              : prevData?.first_name +
                (prevData?.middle_name ? " " + prevData.middle_name : "") +
                " " +
                prevData?.last_name,
          };
        });
      }

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
        "family_account_holder",
        "relation_with_account_holder",
        "permanent_country",
        "account_scheme_id",
        "business_type",
        "gender",
        "salutation",
        "account_info",
        "dedup_identification",
        "existing_risk_rating",
        "marital_status",
        "source_of_income",
        "issued_district_text",
        "designation",
        "national_id_issuing_authority",
        "national_id_issue_place",
        "customer_type_id",
        "constitution_code_id",
      ];

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

    async fetchJointInfoScreening(index, formData) {
      if (
        !(
          formData?.joint_details?.first_name ||
          formData?.joint_details?.[index]?.first_name
        )
      ) {
        this.toast.error("Please enter a First Name");
        return;
      }
      this.setUiSchema((prevUiSchema) => ({
        ...prevUiSchema,
        joint_details: {
          ...prevUiSchema.joint_details,
          items: {
            ...prevUiSchema.joint_details.items,
            personal_info_screening: {
              ...prevUiSchema.joint_details.items.personal_info_screening,
              "ui:disabled": true,
              "ui:options": {
                ...prevUiSchema.joint_details.items.personal_info_screening[
                  "ui:options"
                ],
                show_loader: true,
              },
            },
          },
        },
      }));
      try {
        let payload = {
          first_name:
            formData?.joint_details?.first_name ||
            formData?.joint_details?.[index]?.first_name,
          middle_name:
            formData?.joint_details?.middle_name ||
            formData?.joint_details?.[index]?.middle_name,
          last_name:
            formData?.joint_details?.last_name ||
            formData?.joint_details?.[index]?.last_name,
          father_name:
            formData?.joint_details?.father_name ||
            formData?.joint_details?.[index]?.father_name,
        };

        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/screening-check`,
          payload
        );

        // if (!response) {
        //   throw new Error("Network response was not ok");
        // }
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
          joint_details: prevData?.joint_details?.map((item, i) => {
            return i === index
              ? {
                  ...item,
                  personal_info_screening: "true",
                  personal_screening_data: this.preprocessData(data),
                  screening_ref_code: responseD.uniqueRequestId,
                }
              : item;
          }),
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
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          joint_details: {
            ...prevUiSchema.joint_details,
            items: {
              ...prevUiSchema.joint_details.items,
              personal_info_screening: {
                ...prevUiSchema.joint_details.items.personal_info_screening,
                "ui:disabled": false,
                "ui:options": {
                  ...prevUiSchema.joint_details.items.personal_info_screening[
                    "ui:options"
                  ],
                  show_loader: false,
                },
              },
            },
          },
        }));
      }
    }

    async fetchJointInfoCIFDetail(index, cifId) {
      this.setUiSchema((prevUiSchema) => ({
        ...prevUiSchema,
        joint_details: {
          ...prevUiSchema.joint_details,
          items: {
            ...prevUiSchema.joint_details.items,
            cif_enquiry: {
              ...prevUiSchema.joint_details.items.cif_enquiry,
              "ui:disabled": true,
              "ui:options": {
                ...prevUiSchema.joint_details.items.cif_enquiry["ui:options"],
                show_loader: true,
              },
            },
          },
        },
      }));
      try {
        if (!(cifId ?? this.formData.joint_details[index]?.cif_number)) {
          this.toast.error("Please enter a CIF Number");
          return;
        }
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number: cifId ?? this.formData.joint_details[index]?.cif_number,
            form_title: "joint_secondary",
            id: this.case_id,
            is_minor: this.formData?.is_minor_account,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data;
        this.setFormData((prevFormData) => {
          const updatedJointDetails = [...prevFormData.joint_details];
          updatedJointDetails[index ? index : 0] = {
            // ...updatedJointDetails[index ? index : 0],
            ...resp,
            account_info:
              updatedJointDetails?.[index ? index : 0]?.account_info,
            has_cif: updatedJointDetails?.[index ? index : 0]?.has_cif,
            cif_number: updatedJointDetails?.[index ? index : 0]?.cif_number,
            ...(resp?.national_id_number && {
              national_id_number: this.functionGroup.nidFormat(
                resp?.national_id_number
              ),
            }),
            date_of_birth_bs: resp?.date_of_birth_ad
              ? this.adToBs(resp?.date_of_birth_ad)
              : "",
          };

          const jointNames = updatedJointDetails
            .map(
              (detail) =>
                `${detail.first_name ?? ""} ${detail?.middle_name ?? ""} ${
                  detail?.last_name ?? ""
                }`
            )
            .join(" / ");

          const updatedName = prevFormData.joint_account_name
            ? `${prevFormData.first_name} ${prevFormData.middle_name ?? ""} ${
                prevFormData.last_name
              } / ${jointNames}`
            : jointNames;

          return {
            ...prevFormData,
            joint_account_name: updatedName,
            joint_details: updatedJointDetails,
          };
        });
        // this.disabledArray.push(index);
        // this.setUiSchema((prevUiSchema) => {
        //   return {
        //     ...prevUiSchema,
        //     joint_details: {
        //       ...prevUiSchema?.joint_details,
        //       "ui:options": {
        //         disabledArray: this.disabledArray,
        //       },
        //     },
        //   };
        // });
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
          joint_details: {
            ...prevUiSchema.joint_details,
            items: {
              ...prevUiSchema.joint_details.items,
              cif_enquiry: {
                ...prevUiSchema.joint_details.items.cif_enquiry,
                "ui:disabled": false,
                "ui:options": {
                  ...prevUiSchema.joint_details.items.cif_enquiry["ui:options"],
                  show_loader: false,
                },
              },
            },
          },
        }));
      }
    }

    updateJointAccountName = () => {
      setTimeout(
        () =>
          this.setFormData((prevFormData) => {
            const jointNames = prevFormData.joint_details
              .map(
                (detail) =>
                  `${detail.first_name ?? ""} ${detail?.middle_name ?? ""} ${
                    detail?.last_name ?? ""
                  }`
              )
              .join(" / ");

            const updatedName = prevFormData.joint_account_name
              ? `${prevFormData.first_name} ${prevFormData.middle_name ?? ""} ${
                  prevFormData.last_name
                } / ${jointNames}`
              : jointNames;

            return { ...prevFormData, joint_account_name: updatedName };
          }),
        100
      );
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
      this.updateJointAccountName();
      if (formData?.is_minor_account) {
        setTimeout(() => {
          this.setFormData((prevData) => ({
            ...prevData,
            ...(formData?.joint_details && {
              joint_details: formData?.joint_details?.map((item) => ({
                ...item,
                is_minor_account: formData.is_minor_account,
                marital_status: formData?.is_minor_account ? "UNMAR" : "",
                dedup_identification:
                  item?.dedup_identification === "CTZN"
                    ? null
                    : item?.dedup_identification,
                //   item?.nationality === "NP"
                //     ? item?.is_minor_account
                //       ? null
                //       : "CTZN"
                //     : item?.nationality ===
                //       "IN"
                //     ? null
                //     : "PP",
              })),
            }),
          }));
        }, 100);
        this.setUiSchema((prevSchema) => {
          return {
            ...prevSchema,
            joint_details: {
              ...prevSchema?.joint_details,
              items: {
                ...prevSchema?.joint_details?.items,

                date_of_birth_ad: {
                  ...prevSchema?.joint_details?.items?.date_of_birth_ad,
                  "ui:options": {
                    ...prevSchema?.joint_details?.items?.date_of_birth_ad?.[
                      "ui:options"
                    ],
                    minAge: formData?.is_minor_account ? 18 : 0,
                    disableFutureDates: formData?.is_minor_account,
                    validAge: !formData?.is_minor_account ? 18 : 0,
                  },
                },
                date_of_birth_bs: {
                  ...prevSchema?.joint_details?.items?.date_of_birth_bs,
                  "ui:options": {
                    ...prevSchema?.joint_details?.items?.date_of_birth_bs?.[
                      "ui:options"
                    ],
                    minAge: !formData?.is_minor_account && 0,
                    maxAge: formData?.is_minor_account && 18,
                    disableFutureDates: formData?.is_minor_account,
                    validAge: !formData?.is_minor_account ? 18 : 0,
                  },
                },
              },
            },
          };
        });
        this.setNextStep("guardian");
      } else {
        this.setNextStep("joint-cdd-forma");
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

      const handleLastNameNotAvailableChange = (
        fieldName,
        value,
        arrayPath,
        index
      ) => {
        setTimeout(() => {
          this.setFormData((prevFormData) => {
            const updatedJointDetails = [...prevFormData[arrayPath]];
            updatedJointDetails[index] = {
              ...updatedJointDetails[index],
              [fieldName]:
                this.formData?.last_name !== "N/A" && value
                  ? "N/A"
                  : this.formData?.last_name,
            };

            return {
              ...prevFormData,
              [arrayPath]: updatedJointDetails,
            };
          });
        }, 100);
      };

      const handleEmailNotAvailableChange = (
        fieldName,
        value,
        arrayPath,
        index
      ) => {
        setTimeout(() => {
          this.setFormData((prevFormData) => {
            const updatedJointDetails = [...prevFormData[arrayPath]];
            updatedJointDetails[index] = {
              ...updatedJointDetails[index],
              [fieldName]:
                this.formData?.email !== "N/A" && value
                  ? "N/A"
                  : this.formData?.email,
            };

            return {
              ...prevFormData,
              [arrayPath]: updatedJointDetails,
            };
          });
        }, 100);
      };

      const sameAsPermanentOnChange = (value, index) => {
        setTimeout(
          () =>
            this.setFormData((prevFormData) => {
              const updatedJointDetails = [...prevFormData.joint_details];

              if (value) {
                // Copy permanent address values to current address for the specific index
                updatedJointDetails[index] = {
                  ...updatedJointDetails[index],
                  same_as_permanent: value,
                  current_country:
                    updatedJointDetails[index].permanent_country || "NP",
                  current_province:
                    updatedJointDetails[index].permanent_province || "",
                  current_district:
                    updatedJointDetails[index].permanent_district || "",
                  current_municipality:
                    updatedJointDetails[index].permanent_municipality || "",
                  current_ward_number:
                    updatedJointDetails[index].permanent_ward_number || "",
                  current_street_name:
                    updatedJointDetails[index].permanent_street_name || "",
                  current_town: updatedJointDetails[index].permanent_town || "",
                  current_house_number:
                    updatedJointDetails[index].permanent_house_number || "",
                  current_outside_town:
                    updatedJointDetails[index].permanent_outside_town || "",
                  current_outside_street_name:
                    updatedJointDetails[index].permanent_outside_street_name ||
                    "",
                  current_postal_code:
                    updatedJointDetails[index].permanent_postal_code || "",
                };
              } else {
                // Reset current address fields for the specific index
                updatedJointDetails[index] = {
                  ...updatedJointDetails[index],
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

              return { ...prevFormData, joint_details: updatedJointDetails };
            }),
          100
        );
      };

      // Initialize schema dynamically based on API data
      this.initializeSchema(setJsonSchema, formData);

      // setTimeout(
      //   () =>
      //     this.setFormData((prevData) => ({
      //       ...prevData,
      //       ...(prevData?.joint_details && {
      //         joint_details: prevData?.joint_details?.map((item) => ({
      //           ...item,
      //           is_minor_account:
      //             this.formData.is_minor_account || formData.is_minor_account,
      //           marital_status:
      //             this.formData.is_minor_account || formData.is_minor_account
      //               ? "UNMAR"
      //               : item?.marital_status || "",
      //         })),
      //       }),
      //     })),
      //   200
      // );

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": [
          "joint_account_name",
          "first_name",
          "middle_name",
          "last_name",
          "is_minor_account",
          "account_info",
          "joint_details",
          "personal_screening_data",
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
        is_minor_account: {
          "ui:widget": "hidden",
        },
        account_info: {
          "ui:widget": "hidden",
        },
        // joint_account_name: {
        //   "ui:options": {
        //     setValue: (formData) => this.updateJointAccountName(),
        //   },
        // },

        joint_details: {
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
            "ui:ObjectFieldTemplate": ObjectFieldTemplate,
            connectedPairs: [
              ["lastname", "last_name_not_available"],
              ["email", "email_not_available"],
            ],
            "ui:order": [
              "has_cif",
              "is_minor_account",
              "cif_number",
              "cif_enquiry",
              "account_info",
              "nationality",

              "customer_type_id",
              "account_type_id",
              "account_scheme_id",

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
              "family_account_holder",
              "relation_with_account_holder",
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
              "occupation_type",
              "source_of_income",

              "occupation_detail",
              "business_type",
              "personal_info_screening",
              "personal_screening_data",
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
              "screening_ref_number",
              "external_cdd_id",
              "risk_level",
              "calculate_risk",
              "risk_score",
              "cif_data",
            ],
            is_customer_disabled: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
            },
            "ui:options": {
              addable: false,
            },
            nid_verify: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
              "ui:label": false,
              "ui:classNames": "mt-5 w-100",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.joint_details?.[index ?? 0]?.national_id_number,
                buttonClassName: "w-100",
                onClick: async (index, formData) => {
                  this.setUiSchema((prevUiSchema) => ({
                    ...prevUiSchema,
                    joint_details: {
                      ...prevUiSchema.joint_details,
                      items: {
                        ...prevUiSchema.joint_details.items,
                        nid_verify: {
                          ...prevUiSchema.joint_details.items.nid_verify,
                          "ui:disabled": false,
                          "ui:options": {
                            ...prevUiSchema.joint_details.items.nid_verify[
                              "ui:options"
                            ],
                            show_loader: true,
                          },
                        },
                      },
                    },
                  }));
                  let nidVerifiedValue = "No";
                  try {
                    const response = await this.axios.post(
                      `${this.mainRouteURL}/external-api/verify-nid`,
                      {
                        nin: formData?.joint_details?.[index ?? 0]
                          ?.national_id_number,
                        first_name:
                          formData?.joint_details?.[index ?? 0]?.first_name,
                        last_name:
                          formData?.joint_details?.[index ?? 0]?.last_name,
                        middle_name:
                          formData?.joint_details?.[index ?? 0]?.middle_name,
                        date_of_birth:
                          formData?.joint_details?.[index ?? 0]
                            ?.date_of_birth_ad,
                      }
                    );

                    const responseData = response?.data;
                    nidVerifiedValue =
                      responseData?.resCod == "200" ? "Yes" : "No";
                    this.setModalOpen({
                      open: true,
                      message: responseData?.data?.message,
                      close: "Close",
                      status: "success",
                    });
                  } catch (err) {
                    nidVerifiedValue = "No";
                    this.setModalOpen({
                      open: true,
                      message: err?.response?.data?.message,
                      close: "Close",
                      status: "error",
                    });
                  } finally {
                    this.setUiSchema((prevUiSchema) => ({
                      ...prevUiSchema,
                      joint_details: {
                        ...prevUiSchema.joint_details,
                        items: {
                          ...prevUiSchema.joint_details.items,
                          nid_verify: {
                            ...prevUiSchema.joint_details.items.nid_verify,
                            "ui:disabled": false,
                            "ui:options": {
                              ...prevUiSchema.joint_details.items.nid_verify[
                                "ui:options"
                              ],
                              show_loader: false,
                            },
                          },
                        },
                      },
                    }));
                    this.setFormData((prevForm) => ({
                      ...prevForm,
                      joint_details: prevForm?.joint_details?.map((item, idx) =>
                        idx === index
                          ? {
                              ...item,
                              nid_verified: nidVerifiedValue,
                            }
                          : item
                      ),
                    }));
                  }
                },
              },
            },
            nid_reset: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
              "ui:label": false,
              "ui:classNames": "mt-5 w-100",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.joint_details?.[index ?? 0]?.nid_verified,
                buttonClassName: "w-100",
                onClick: async (index) => {
                  this.dropdownReset(
                    {
                      national_id_number: null,
                      national_id_issue_date_ad: "",
                      national_id_issue_date_bs: "",
                      national_id_issue_place: "",
                      nid_verified: "",
                    },
                    "joint_details",
                    index
                  );
                },
              },
            },

            cif_data: {
              "ui:widget": "hidden",
            },
            has_cif: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) =>
                  !value &&
                  setTimeout(
                    () =>
                      setFormData((prev) => {
                        return {
                          ...prev,
                          joint_details: prev?.joint_details?.map((item, idx) =>
                            idx === index
                              ? {
                                  account_info: item?.account_info,
                                  is_minor_account: item?.is_minor_account,
                                }
                              : item
                          ),
                        };
                      }),
                    100
                  ),
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
            is_minor_account: {
              "ui:widget": "hidden",
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
                        maxAge: value && 18,
                        minAge: !value && 0,
                        disableFutureDates: value,
                        validAge: !value ? 18 : 0,
                      },
                    },
                  }));
                },
              },
            },

            same_as_permanent: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) =>
                  sameAsPermanentOnChange(value, index ?? 0),
              },
            },
            first_name: {
              "ui:options": {
                onBlurCapture: () => this.updateJointAccountName(),
              },
            },

            middle_name: {
              "ui:options": {
                onBlurCapture: () => this.updateJointAccountName(),
              },
            },
            last_name: {
              "ui:options": {
                onBlurCapture: () => this.updateJointAccountName(),
              },
            },
            account_info: {
              "ui:widget": "hidden",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) => {
                  return this.dropdownReset(
                    {
                      account_type_id: value,
                      account_scheme_id: null,
                    },
                    "joint_details",
                    index
                  );
                },
              },
            },
            customer_type_id: {},

            dedup_check: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
              "ui:label": false,
              "ui:disabled": false,
              "ui:classNames":
                "d-flex justify-content-end align-items-end h-100 my-1",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.joint_details?.some(
                    (item, idx) => idx === index && item?.first_name
                  ),
                onClick: (index) => {
                  this.getDedupCheck(index ?? 0);
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
                    match: (record, index) => {
                      if (record?.cif_number !== "-") {
                        this.setFormData((prev) => ({
                          ...prev,
                          joint_details: prev?.joint_details?.map((item, idx) =>
                            idx === index
                              ? {
                                  ...item,
                                  has_cif: true,
                                  cif_number: record?.cif_number,
                                }
                              : item
                          ),
                        }));
                        this.fetchJointInfoCIFDetail(index, record?.cif_number);
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
            family_information: {
              "ui:widget": "EditableTableWidget",
              "ui:label": false,
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
                        familyInfo[rowIndex]?.family_member_relation?.trim() ||
                        "";

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
                  "ui:options": {
                    setDisabled: (formData, index) =>
                      this.form_status.includes("init") ||
                      this.form_status.includes("update")
                        ? (formData?.joint_details?.[index[0]]
                            ?.family_information?.[index[1]]
                            ?.family_member_relation === "FATHE" &&
                            formData?.joint_details?.[index[0]]?.father_name) ||
                          formData?.joint_details?.[index[0]]
                            ?.family_information?.[index[1]]
                            ?.is_family_name_not_available
                        : true,
                  },
                },

                is_family_name_not_available: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:options": {
                    setDisabled: (formData, index) => {
                      return formData?.joint_details?.[index?.[0]]
                        ?.family_information?.[index?.[1]]
                        ?.family_member_relation === "FATHE" &&
                        formData?.joint_details?.[index?.[0]]?.father_name
                        ? true
                        : false;
                    },

                    onChange: (value, index) => {
                      setTimeout(
                        () =>
                          this.familyNameChange(
                            "family_member_full_name",
                            value,
                            "family_information",
                            index ?? 0
                          ),
                        100
                      );
                    },
                  },
                },
              },
            },
            salutation: {
              "ui:widget": "CustomRadioWidget",
              "ui:options": {
                getOptions: (formData) => {
                  return this.functionGroup?.getRequiredDocuments(
                    this.optionsData["multi_validation_mapping"],
                    {
                      account_info: formData?.is_minor_account
                        ? "MINOR"
                        : formData?.account_info,
                    }
                  );
                },

                // getOptions: (formData) => {
                //   return formData?.account_scheme_id ===
                //     "e1d843a7-8062-4190-a26d-846a85b0f4ad"
                //     ? this.filterOptions("salutations", formData?.account_scheme_id)
                //     : this.functionGroup?.getRequiredDocuments(
                //         this.optionsData["multi_validation_mapping"],
                //         {
                //           account_info: formData?.account_info,
                //         }
                //       );
                // },
                onChange: (value, index) => {
                  this.dropdownReset(
                    {
                      salutation: value,
                      gender: null,
                    },
                    "joint_details",
                    index ?? 0
                  );
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
                    return (
                      value !== undefined && value !== null && value !== ""
                    );
                  });

                  return this.form_status?.includes("init") && !allFilled;
                },
                onClick: (index) => {
                  this.calculateRisk(index ?? 0);
                },
              },
            },

            last_name_not_available: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) => {
                  handleLastNameNotAvailableChange(
                    "last_name",
                    value,
                    "joint_details",
                    index ?? 0
                  );
                },
              },
            },
            email_not_available: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) => {
                  handleEmailNotAvailableChange(
                    "email",
                    value,
                    "joint_details",
                    index ?? 0
                  );
                },
              },
            },

            dedup_id_number: {
              "ui:options": {
                onChange: (value, index) => {
                  this.convertToArray(
                    value,
                    "identification_number",
                    "id_type_details",
                    ["dedup_identification", "id_type_id"],
                    index ?? 0,
                    "joint_details"
                  );
                },
              },
            },
            father_name: {
              "ui:options": {
                onChange: (value, index) => {
                  this.convertToArray(
                    value,
                    "family_member_full_name",
                    "family_information",
                    null,
                    index ?? 0,
                    "joint_details"
                  );
                },
              },
            },
            gender: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "genders",
                    formData?.joint_details &&
                      formData?.joint_details[index]?.salutation
                  );
                },
              },
            },

            cif_enquiry: {
              "ui:widget": "ButtonField",
              "ui:label": false,
              "ui:classNames": "d-flex h-100 mt-4 align-items-center",
              "ui:options": {
                onClick: (index) => {
                  setTimeout(
                    () =>
                      setFormData((prev) => ({
                        ...prev,
                        joint_details: prev?.joint_details?.map((item, idx) =>
                          idx === index
                            ? {
                                account_info: item?.account_info,
                                is_minor_account: item?.is_minor_account,
                                has_cif: item?.has_cif,
                                cif_number: item?.cif_number,
                              }
                            : item
                        ),
                      })),
                    100
                  ),
                    this.fetchJointInfoCIFDetail(index ? index : 0);
                },
              },
            },
            // last_name_not_available: {
            //   "ui:options": {
            //     onChange: (value, index) => {
            //       handleLastNameNotAvailableChange(
            //         "last_name",
            //         value,
            //         "joint_details",
            //         index ?? 0
            //       );
            //     },
            //   },
            // },
            // email_not_available: {
            //   "ui:options": {
            //     onChange: (value, index) => {
            //       handleEmailNotAvailableChange(
            //         "email",
            //         value,
            //         "joint_details",
            //         index ?? 0
            //       );
            //     },
            //   },
            // },
            national_id_issue_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Issued Date (A.D)",
              "ui:options": {
                enforceAgeRestriction: false,
                validAge: 0,
                name: "national_id_issue_date_ad",
                enforceAgeRestriction: true,
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  return (
                    formData?.joint_details?.[index]?.date_of_birth_ad &&
                    this.moment(
                      formData?.joint_details?.[index]?.date_of_birth_ad
                    )
                      .add(1, "day")
                      .format("YYYY-MM-DD")
                  );
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    true,
                    "national_id_issue_date_ad",
                    "joint_details",
                    index ? index : 0
                  );
                },
              },
            },
            national_id_issue_date_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:options": {
                enforceAgeRestriction: true,
                disableFutureDates: true,
                validAge: 0,
                name: "national_id_issue_date_bs",
                minimumDate: (formData, index) => {
                  return (
                    formData?.joint_details?.[index]?.date_of_birth_bs &&
                    this.moment(
                      formData?.joint_details?.[index]?.date_of_birth_bs
                    ).format("YYYY-MM-DD")
                  );
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    true,
                    "national_id_issue_date_bs",
                    "joint_details",
                    index ? index : 0
                  );
                },
              },
            },

            date_of_birth_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Date of Birth (A.D)",
              "ui:options": {
                name: "date_of_birth_ad",
                enforceAgeRestriction: true,
                validAge: 18,
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    true,
                    "date_of_birth_ad",
                    "joint_details",
                    index ? index : 0
                  );
                },
              },
            },
            date_of_birth_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:options": {
                enforceAgeRestriction: true,
                name: "date_of_birth_bs",
                minAge: !this.formData?.is_minor_account && 0,
                maxAge: this.formData?.is_minor_account && 18,
                disableFutureDates: true,
                validAge: !this.formData?.is_minor_account ? 18 : 0,
                onDateChange: (selectedDate, index) => {
                  this.convertDate(
                    selectedDate,
                    setFormData,
                    false,
                    "date_of_birth_bs",
                    "joint_details",
                    index ? index : 0
                  );
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
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      occupation_type: value,
                      source_of_income: this.optionsData["occupation_rule"]?.[
                        `source_of_income_list`
                      ]?.find((item) => item?.cascade_id?.includes(value))?.id,
                    },
                    "joint_details",
                    index ?? 0
                  ),
              },
            },

            source_of_income: {
              // "ui:widget": "CascadeDropdown",
              "ui:options": {
                // getOptions: (formData, index) => {
                //   return this.filterOptionsOccupation(
                //     "occupation_rule",
                //     "source_of_income_list",
                //     formData?.joint_details?.[index]?.occupation_type
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
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      const filteredData = this.filterOptionsOccupation(
                        "occupation_rule",
                        "business_type_list",
                        formData?.joint_details?.[index?.[0]]?.occupation_type
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
            nationality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  return this.filterOptions("nationalities");
                },
                onChange: (value, index) => {
                  this.dropdownReset(
                    {
                      nationality: value,
                      dedup_id_number: "",
                      dedup_identification:
                        value === "NP"
                          ? this.formData?.joint_details?.[index]
                              ?.is_minor_account
                            ? null
                            : "CTZN"
                          : value === "IN"
                          ? null
                          : "PP",
                      permanent_country:
                        value === "NP"
                          ? "NP"
                          : this.formData?.permanent_country,
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
                    },
                    "joint_details",
                    index
                  );
                  value === "NP" && (this.nationalityChanged = true);

                  console.log(value);
                  return null;
                },
              },
            },

            dedup_identification: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   setDisabled: (formData, index) =>
              //     !(
              //       formData?.joint_details?.[index]?.nationality === "IN" ||
              //       formData?.joint_details?.[index]?.nationality === "NP"
              //     ),
              //   getOptions: (formData, index) => {
              //     if (
              //       formData?.joint_details?.[index]?.dedup_identification &&
              //       this.nationalityChanged === true
              //     ) {
              //       const clone = JSON.parse(JSON.stringify(formData));
              //       const value =
              //         clone?.joint_details?.[
              //           Array.isArray(index) ? index[0] : index
              //         ]?.dedup_identification;
              //       this.convertToArray(
              //         value,
              //         "id_type_id",
              //         "id_type_details",
              //         ["dedup_identification", "id_type_id"],
              //         index[0] ?? index,
              //         "joint_details"
              //       );
              //       this.nationalityChanged = false;
              //     }
              //     const d = this.functionGroup?.getRequiredDocuments(
              //       this.optionsData["multi_validation_mapping"],
              //       {
              //         nationality:
              //           formData?.joint_details?.[index]?.nationality,
              //         account_type: formData?.is_minor_account
              //           ? "MINOR"
              //           : formData?.account_info,
              //       }
              //     );
              //     return d?.filter(
              //       (doc) => !["PANR", "WPERM"].includes(doc.value)
              //     );
              //   },
              //   onChange: (value, index) => {
              //     this.convertToArray(
              //       value,
              //       "id_type_id",
              //       "id_type_details",
              //       ["dedup_identification", "id_type_id"],
              //       index ?? 0,
              //       "joint_details"
              //     );
              //   },
              // },
            },
            relation_with_account_holder: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) =>
                  this.filterOptions(
                    "relationships",
                    formData?.joint_details &&
                      formData?.joint_details?.[index ?? 0]
                        ?.family_account_holder
                  ),
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
                  "nrn_card_number",
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
                id_type_id: {
                  // "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    setDisabled: (formData, index) => {
                      if (
                        formData?.joint_details?.[index?.[0]]
                          ?.id_type_details?.[index?.[1]]?.id_type_id ===
                        formData?.joint_details?.[index?.[0]]
                          ?.dedup_identification
                      )
                        return true;
                    },
                    // getOptions: (formData, index) => {
                    //   setTimeout(
                    //     () =>
                    //       this.setFormData((prev) => ({
                    //         ...prev,
                    //         joint_details: prev.joint_details?.map(
                    //           (jointDetails) => ({
                    //             ...jointDetails,
                    //             id_type_details:
                    //               jointDetails?.id_type_details?.map(
                    //                 (item) => ({
                    //                   ...item,
                    //                   ...(item?.id_type_id && {
                    //                     disable: true,
                    //                     issue_country:
                    //                       item?.id_type_id === "TRDOC"
                    //                         ? "NP"
                    //                         : item?.issue_country
                    //                         ? item?.issue_country
                    //                         : jointDetails?.nationality === "NP" // Nepalese
                    //                         ? "NP" // Nepal
                    //                         : jointDetails?.nationality ===
                    //                           "fc427fcf-290d-4ef1-8048-1af42ba3f02c" // Chinese
                    //                         ? "CN" // China
                    //                         : jointDetails?.nationality ===
                    //                           "47ea7bb9-7fa8-4441-a1fc-0f8b79812268" // American
                    //                         ? "US" // USA
                    //                         : jointDetails?.nationality === "US" // Australian
                    //                         ? "cdbb05bf-7db0-4a00-9607-cfdff798457b" // Australia
                    //                         : jointDetails?.nationality ===
                    //                           "bec5d07d-42fe-4fcf-a945-51b23465f31a" // Korean
                    //                         ? "KR" // Republic
                    //                         : jointDetails?.nationality === "IN"
                    //                         ? "IN"
                    //                         : item?.issue_country ?? null,
                    //                   }),
                    //                 })
                    //               ),
                    //           })
                    //         ),
                    //       })),
                    //     100
                    //   );

                    //   const newSelectedData = formData?.joint_details?.[
                    //     index?.[0]
                    //   ]?.id_type_details?.map((item, idx) =>
                    //     idx !== index ? item?.id_type_id : null
                    //   );

                    //   const filterOption =
                    //     this.functionGroup?.getRequiredDocuments(
                    //       this.optionsData["multi_validation_mapping"],
                    //       {
                    //         nationality:
                    //           formData?.joint_details?.[index[0]]?.nationality,
                    //         account_type: formData?.is_minor_account
                    //           ? "MINOR"
                    //           : formData?.account_info,
                    //       }
                    //     );

                    //   const currentSelectedValue =
                    //     formData?.joint_details?.[index?.[0]]
                    //       ?.id_type_details?.[index?.[1]]?.id_type_id;

                    //   const dropdownOptions = filterOption?.filter((item) => {
                    //     if (!item || !item.value || item.value.trim() === "")
                    //       return false;
                    //     return (
                    //       item.value === currentSelectedValue ||
                    //       !newSelectedData?.includes(item.value)
                    //     );
                    //   });

                    //   return dropdownOptions || [];
                    // },
                    onChange: (data, index) => {
                      const documentTypes = {
                        citizenship_number: "CTZN",
                        passport: "PP",
                        driving_license: "LCNSE",
                        voter_id: "VOTER",
                        nid: "NID",
                        pan: "PANR",
                      };

                      const issuingAuthorities = {
                        citizenship_number: "DAO",
                        passport: "85bdeca6-4cb1-435e-a81c-e65a04a910f4",
                        driving_license: "NA",
                        voter_id: "a4e3fa6d-133d-40da-8996-444207b7f2a2",
                        nid: "DONICR",
                        pan: "IRD",
                      };

                      const docTypeKey = Object.keys(documentTypes).find(
                        (key) => documentTypes[key] === data
                      );

                      this.setFormData((prev) => ({
                        ...prev,
                        joint_details: prev.joint_details?.map(
                          (jointDetails) => ({
                            ...jointDetails,
                            id_type_details: jointDetails?.id_type_details?.map(
                              (item, idx) =>
                                idx === index?.[1]
                                  ? {
                                      ...item,
                                      id_type_id: data,
                                      issuing_authority:
                                        issuingAuthorities[docTypeKey] ?? null,
                                    }
                                  : item
                            ),
                          })
                        ),
                      }));
                    },
                  },
                },

                issue_country: {},
                // identification_number: {
                //   "ui:options": {
                //     setDisabled: (formData, index) => {
                //       if (
                //         formData?.joint_details?.[index?.[0]]
                //           ?.id_type_details?.[index?.[1]]?.id_type_id ===
                //         formData?.joint_details?.[index?.[0]]
                //           ?.dedup_identification
                //       )
                //         return true;
                //     },
                //   },
                // },
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
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.joint_details?.[
                        index[0]
                      ]?.id_type_details?.map((item) =>
                        this.moment(
                          formData?.joint_details?.[index[0]]?.date_of_birth_ad
                        )
                          .add(
                            formData?.is_minor_account ? 1 : 16,
                            formData?.is_minor_account ? "days" : "years"
                          )
                          .format("YYYY-MM-DD")
                      );
                      return minDateValue && minDateValue[0];
                    },

                    onDateChange: (selectedDate, index) => {
                      this.convertDateMultipleLayer(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "id_issued_date",
                        "joint_details.id_type_details"
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
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.joint_details?.[
                        index
                      ]?.id_type_details?.map((item) =>
                        this.NepaliDate.parseEnglishDate(
                          this.moment(
                            formData?.joint_details?.[index[0]]
                              ?.date_of_birth_ad
                          )
                            .add(
                              formData?.is_minor_account ? 1 : 16,
                              formData?.is_minor_account ? "days" : "years"
                            )
                            .format("YYYY-MM-DD"),
                          "YYYY-MM-DD"
                        ).format("YYYY-MM-DD")
                      );
                      return minDateValue && minDateValue[0];
                    },
                    onDateChange: (selectedDate, index) => {
                      this.convertDateMultipleLayer(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "id_issued_date",
                        "joint_details.id_type_details"
                      );
                    },
                  },
                },
                id_expiry_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Expiry Date (A.D)",
                  "ui:options": {
                    setValue: (formData, index) => {
                      const match = formData?.joint_details?.[
                        index[0]
                      ]?.id_type_details?.find((item, dataIndex) =>
                        ["BRTCT", "MICRD"].includes(item?.id_type_id)
                      );
                      if (
                        match &&
                        formData?.joint_details?.[index[0]]?.date_of_birth_ad
                      ) {
                        let extended_date = new Date(
                          formData?.joint_details?.[index[0]]?.date_of_birth_ad
                        );
                        extended_date.setFullYear(
                          extended_date.getFullYear() + 16
                        );

                        setFormData((prev) => ({
                          ...prev,
                          joint_details: prev?.joint_details.map((item, idx) =>
                            idx === index[0]
                              ? {
                                  ...item,
                                  id_type_details: item?.id_type_details?.map(
                                    (data) =>
                                      ["BRTCT", "MICRD"].includes(
                                        data?.id_type_id
                                      )
                                        ? {
                                            ...data,
                                            id_expiry_date_ad:
                                              this.moment(extended_date).format(
                                                "YYYY-MM-DD"
                                              ),
                                            id_expiry_date_bs:
                                              this.NepaliDate.parseEnglishDate(
                                                this.moment(
                                                  extended_date
                                                ).format("YYYY-MM-DD"),
                                                "YYYY-MM-DD"
                                              ).format("YYYY-MM-DD"),
                                          }
                                        : data
                                  ),
                                }
                              : item
                          ),
                        }));
                      }
                    },
                    enforceAgeRestriction: false,
                    minDate: 0,
                    name: "id_expiry_date_ad",
                    enforceAgeRestriction: true,
                    enableFutureDates: true,
                    onDateChange: (selectedDate, index) => {
                      this.convertDateMultipleLayer(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "id_expiry_date",
                        "joint_details.id_type_details"
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
                      this.convertDateMultipleLayer(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "id_expiry_date",
                        "joint_details.id_type_details"
                      );
                    },
                  },
                },
                issued_district: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      const identification =
                        formData?.joint_details?.[index?.[0]]
                          ?.id_type_details?.[index[1]]?.id_type_id;
                      return this.filterOptions(
                        identification === "PP" || identification === "EMBSY"
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
                        formData?.joint_details?.[index?.[0]]
                          ?.id_type_details?.[index[1]]?.id_type_id;
                      return this.filterOptions(
                        identification === "PP" || identification === "EMBSY"
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

                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.joint_details[
                        index
                      ]?.id_type_details?.map((item) =>
                        this.moment(item?.id_issued_date_ad).format(
                          "YYYY-MM-DD"
                        )
                      );

                      return minDateValue && minDateValue[0];
                    },
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

            personal_info_screening: {
              "ui:widget": "hidden",
              "ui:label": false,
              "ui:classNames": "my-3",
              "ui:options": {
                onClick: (index, formData) => {
                  this.fetchJointInfoScreening(index ? index : 0, formData);
                },
              },
            },
            personal_screening_data: {
              "ui:widget": "ScreeningReportCard",
              "ui:label": false,
              showCheckbox: true,
              fixedActionsColumn: true,
              showFooter: true,
              showViewedColumn: false,

              "ui:options": {
                showActionText: true,
                onCheckboxChange: (tableData, category, checked, index) => {
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
                    joint_details: prevData?.joint_details?.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            [categoryKey]: hasChecked ? "Yes" : "No",
                            personal_screening_data: tableData,
                          }
                        : item
                    ),
                  }));
                },

                actionHandlers: {
                  view: (record) => setIsModalVisible(true),
                },
              },
            },

            permanent_province: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions("provinces");
                },
                onChange: (value, index) => {
                  return this.dropdownReset(
                    {
                      permanent_province: value,
                      permanent_district: null,
                      permanent_municipality: null,
                    },
                    "joint_details",
                    index ?? 0
                  );
                },
              },
            },
            permanent_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "districts",
                    formData.joint_details &&
                      formData.joint_details[index]?.permanent_province
                  );
                },
              },
            },

            permanent_municipality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "local_bodies",
                    formData.joint_details &&
                      formData.joint_details[index]?.permanent_district
                  );
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
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      occupation_type: value,
                      source_of_income: this.optionsData["occupation_rule"]?.[
                        `source_of_income_list`
                      ]?.find((item) => item?.cascade_id?.includes(value))?.id,
                    },
                    "joint_details",
                    index ?? 0
                  ),
              },
            },

            source_of_income: {
              // "ui:widget": "CascadeDropdown",
              "ui:options": {
                // getOptions: (formData, index) => {
                //   return this.filterOptionsOccupation(
                //     "occupation_rule",
                //     "source_of_income_list",
                //     formData?.joint_details?.[index]?.occupation_type
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
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      const filteredData = this.filterOptionsOccupation(
                        "occupation_rule",
                        "business_type_list",
                        formData?.joint_details?.[index?.[0]]?.occupation_type
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
            is_existing_cif: {
              "ui:widget": "hidden",
            },
            is_block_list: {
              "ui:widget": "hidden",
            },
            scheme_check: {
              "ui:widget": "hidden",
            },
            is_cib_list: {
              "ui:widget": "hidden",
            },
            is_sanction: {
              "ui:widget": "hidden",
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
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
