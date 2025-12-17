(function () {
  if (window.UISchemaFactory) {
    delete window.UISchemaFactory;
  }

  class UISchemaFactory {
    constructor(masterDataUrl, options = {}) {
      this.axios = options.axios;
      this.mainRouteURL = options.mainRouteURL;
      this.toast = options.toast;
      this.form_status = options.form_status;
      this.optionsData = options.optionsData;
      this.setOptionsData = options.setOptionsData;
      this.formData = options.formData;
      this.setFormData = options.setFormData;
      this.setModalOpen = options.setModalOpen;
      this.setJsonSchema = options.setJsonSchema;
      this.setDivide = options.setDivide;
      this.setUiSchema = options.setUiSchema;
      this.adToBs = options.adToBs;
      this.bsToAd = options.bsToAd;
      this.masterDataUrl = masterDataUrl;
      this.isMasterDataLoaded = false;
      this.setNextStep = options.setNextStep;
      this.setRenderFormKey = options.setRenderFormKey;
      this.functionGroup = options.functionGroup;
      this.moment = options.moment;
      this.NepaliDate = options.NepaliDate;
      this.case_id = options.case_id;
      this.nationalityChanged = false;
      this.nationalityChangedMultiple = false;
      this.disabledArray = [];
      this.toast = options.toast;
    }

    customValidate(formData, errors, uiSchema) {
      const cloneFormData = JSON.parse(JSON.stringify(formData));
      cloneFormData.related_party = cloneFormData?.related_party?.map(
        (relatedParty) => ({
          ...relatedParty,
          permanent_municipality: this.optionsData["local_bodies"]?.find(
            (item) => item?.id === relatedParty?.permanent_municipality
          )?.title,
          related_party_detail: relatedParty?.related_party_detail?.map(
            (relatedPartyDetail) => ({
              ...relatedPartyDetail,
              permanent_municipality: this.optionsData["local_bodies"]?.find(
                (detail) =>
                  detail?.id === relatedPartyDetail?.permanent_municipality
              )?.title,
            })
          ),
        })
      );

      this.functionGroup?.validateCombinedLength(cloneFormData, errors, {
        type: "permanent",
        arrayPath: "related_party.related_party_detail",
        fieldNames: {
          town: "ward_number",
          street: "street_name",
          postalCode: "municipality",
        },
      });
      this.functionGroup?.validateCombinedLength(cloneFormData, errors, {
        type: "permanent",
        arrayPath: "related_party",
        fieldNames: {
          town: "ward_number",
          street: "street_name",
          postalCode: "municipality",
        },
      });
      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "permanent",
        arrayPath: "related_party.related_party_detail",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });
      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "permanent",
        arrayPath: "related_party",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });

      //Check if the User has Viewed the Application
      this.functionGroup?.checkAndAssignScreeningErrors(formData, errors);

      const validateNestedFields = ({
        data,
        errors,
        requiredFields,
        currentPath = [],
      }) => {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            validateNestedFields({
              data: item,
              errors,
              requiredFields,
              currentPath: [...currentPath, index],
            });
          });
        } else if (typeof data === "object" && data !== null) {
          for (const key in data) {
            if (data.hasOwnProperty(key)) {
              const value = data[key];

              // If this key is in requiredFields and value is empty -> Add error
              if (requiredFields.includes(key)) {
                const fieldValue = value?.toString().trim?.();
                if (!fieldValue) {
                  // Build path in the errors object
                  let errorRef = errors;
                  for (const pathPart of currentPath) {
                    errorRef[pathPart] ??= {};
                    errorRef = errorRef[pathPart];
                  }
                  // errorRef[key] ??= { addError: (msg) => {} };
                  errorRef[key].addError?.("Required");
                }
              }

              if (key === "nid_verified" && value === "No") {
                let errorRef = errors;
                for (const pathPart of currentPath) {
                  errorRef[pathPart] ??= {};
                  errorRef = errorRef[pathPart];
                }
                errorRef[key]?.addError?.("NID must be verified.");
              }

              // Recurse deeper
              validateNestedFields({
                data: value,
                errors,
                requiredFields,
                currentPath: [...currentPath, key],
              });
            }
          }
        }
      };

      validateNestedFields({
        data: formData,
        errors,
        requiredFields: ["family_member_full_name"],
      });

      return errors;
    }

    addLoader(arrayNames, loading) {
      this.setUiSchema((prevUiSchema) => ({
        ...prevUiSchema,
        [arrayNames[0]]: {
          ...prevUiSchema[arrayNames[0]],
          items: {
            ...prevUiSchema[arrayNames[0]].items,
            [arrayNames[1]]: {
              ...prevUiSchema[arrayNames[0]].items[arrayNames[1]],
              "ui:disabled": loading,
              "ui:options": {
                ...prevUiSchema[arrayNames[0]].items[arrayNames[1]][
                  "ui:options"
                ],
                show_loader: loading,
              },
            },
          },
        },
      }));
    }
    addLoaderMultiple(arrayNames, loading) {
      this.setUiSchema((prevUiSchema) => ({
        ...prevUiSchema,
        [arrayNames[0]]: {
          ...prevUiSchema[arrayNames[0]],
          items: {
            ...prevUiSchema[arrayNames[0]].items,
            related_party_detail: {
              ...prevUiSchema[arrayNames[0]].items[arrayNames[1]],
              items: {
                ...prevUiSchema[arrayNames[0]].items[arrayNames[1]].items,
                [arrayNames[2]]: {
                  ...prevUiSchema[arrayNames[0]].items[arrayNames[1]].items[
                    arrayNames[2]
                  ],
                  "ui:disabled": loading,
                  "ui:options": {
                    ...prevUiSchema[arrayNames[0]].items[arrayNames[1]].items[
                      arrayNames[2]
                    ]["ui:options"],
                    show_loader: loading,
                  },
                },
              },
            },
          },
        },
      }));
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

    async formDataCleaner(fields, isMultiLayer, index) {
      if (typeof this.formData !== "object" || this.formData === null)
        return {};
      const result = {};
      const filterData = !isMultiLayer
        ? this.formData?.related_party?.[index]
        : this.formData?.related_party?.[index?.[0]]?.related_party_detail?.[
            index?.[1]
          ];

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
          isMultiLayer
            ? this.setFormData((prevData) => ({
                ...prevData,
                related_party: prevData?.related_party?.map((item, idx) =>
                  index?.[0] === idx
                    ? {
                        ...item,
                        related_party_detail: item?.related_party_detail?.map(
                          (data, idx2) =>
                            index[1] === idx2 ? { ...result } : data
                        ),
                      }
                    : item
                ),
              }))
            : this.setFormData((prevData) => ({
                ...prevData,
                related_party: prevData?.related_party?.map((item, idx) =>
                  index === idx ? { ...result } : item
                ),
              })),
        100
      );

      // this.setFormData(result)
      return result;
    }
    async getDedupCheck(index, isMultiLayer = false) {
      const nonClearableField = [
        "designation",
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
      !(
        this.formData?.related_party?.[index]?.has_cif ||
        this.formData?.related_party?.[index?.[0]]?.related_party_detail[
          index?.[1]
        ]?.has_cif
      ) && this.formDataCleaner(nonClearableField, isMultiLayer, index);

      isMultiLayer
        ? this.addLoaderMultiple(
            ["related_party", "related_party_detail", "dedup_check"],
            true
          )
        : this.addLoader(["related_party", "dedup_check"], true);
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check`,
          {
            first_name: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.first_name
              : this.formData?.related_party?.[index].first_name,
            middle_name: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.middle_name
              : this.formData?.related_party?.[index].middle_name,
            last_name: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.last_name
              : this.formData?.related_party?.[index].last_name,
            father_name: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.father_name
              : this.formData?.related_party?.[index].father_name,
            id_number: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.dedup_id_number
              : this.formData?.related_party?.[index].dedup_id_number,
            document_type: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.dedup_identification
              : this.formData?.related_party?.[index].dedup_identification,
            citizenship_number: null,
            dob_ad: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.date_of_birth_ad
              : this.formData?.related_party?.[index].date_of_birth_ad,
            dob_bs: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.date_of_birth_bs
              : this.formData?.related_party?.[index].date_of_birth_bs,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data?.dedup_response;
        if (resp?.message?.includes("No Data")) {
          this.toast.info(resp.message);
        } else if (isMultiLayer) {
          this.setFormData((prevData) => ({
            ...prevData,
            related_party: prevData?.related_party?.map((item, idx) =>
              index?.[0] === idx
                ? {
                    ...item,
                    related_party_detail: item?.related_party_detail?.map(
                      (data, idx2) =>
                        index[1] === idx2
                          ? {
                              ...data,
                              dedup_module_data: this.preprocessData(resp),
                            }
                          : data
                    ),
                  }
                : item
            ),
          }));
        } else {
          this.setFormData((prevData) => ({
            ...prevData,
            related_party: prevData?.related_party?.map((item, idx) =>
              index === idx
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
        isMultiLayer
          ? this.addLoaderMultiple(
              ["related_party", "related_party_detail", "dedup_check"],
              false
            )
          : this.addLoader(["related_party", "dedup_check"], false);
      }
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

    convertToArrayMultiple(
      value,
      key,
      parentKey,
      comparisionKey,
      indexPath,
      arrayPath
    ) {
      setTimeout(() => {
        this.setFormData((prevData) => {
          if (
            !prevData[arrayPath[0]]?.[indexPath[0]]?.[arrayPath[1]]?.[
              indexPath[1]
            ]?.[parentKey]
          )
            return prevData;
          if (!comparisionKey || comparisionKey.length === 0) {
            return {
              ...prevData,
              [arrayPath[0]]: prevData[arrayPath[0]]?.map((item, arrIndex) => {
                return arrIndex === indexPath[0]
                  ? {
                      ...item,
                      [arrayPath[1]]: item[arrayPath[1]]?.map(
                        (item2, arrIndex) => {
                          return arrIndex === indexPath[1]
                            ? {
                                ...item2,

                                [parentKey]: item2[parentKey]?.map(
                                  (data, index) =>
                                    index === 0 ? { [key]: value } : data
                                ),
                              }
                            : item2;
                        }
                      ),
                    }
                  : item;
              }),
            };
          }
          const updatedArray = prevData[arrayPath[0]]?.[indexPath[0]]?.[
            arrayPath[1]
          ]?.[indexPath[1]]?.[parentKey]?.map((item) => {
            if (Object.keys(item).length === 0)
              return {
                [comparisionKey[1]]:
                  prevData[arrayPath[0]]?.[indexPath[0]]?.[arrayPath[1]]?.[
                    indexPath[1]
                  ]?.[comparisionKey[0]],
                [key]: value,
              };

            if (
              comparisionKey &&
              item[comparisionKey[1]] ===
                prevData[arrayPath[0]]?.[indexPath[0]]?.[arrayPath[1]]?.[
                  indexPath[1]
                ]?.[comparisionKey[0]]
            ) {
              return { ...item, [key]: value };
            }

            return item;
          });

          if (
            comparisionKey &&
            !updatedArray.some(
              (item) =>
                item[comparisionKey[1]] ===
                prevData[arrayPath[0]]?.[indexPath[0]]?.[arrayPath[1]]?.[
                  indexPath[1]
                ]?.[comparisionKey[0]]
            )
          ) {
            updatedArray.push({
              [comparisionKey[1]]:
                prevData[arrayPath[0]]?.[indexPath[0]]?.[arrayPath[1]]?.[
                  indexPath[1]
                ]?.[comparisionKey[0]],
              [key]: value,
            });
          }

          return {
            ...prevData,
            [arrayPath[0]]: prevData[arrayPath[0]]?.map((item, arrIndex) => {
              return arrIndex === indexPath[0]
                ? {
                    ...item,
                    [arrayPath[1]]: item[arrayPath[1]]?.map(
                      (item2, arrIndex) => {
                        return arrIndex === indexPath[1]
                          ? { ...item2, [parentKey]: updatedArray }
                          : item2;
                      }
                    ),
                  }
                : item;
            }),
          };
        });
      }, 100);
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

    dropdownResetMultipleLayer = async (
      dropdownClearObject,
      arrayNames,
      indices
    ) => {
      this.setFormData((prevFormData) => {
        const data =
          arrayNames?.length > 0
            ? {
                ...prevFormData,
                [arrayNames[0]]: prevFormData[arrayNames[0]]?.map(
                  (item, arrIndex) => {
                    return arrIndex === indices[0]
                      ? {
                          ...item,
                          [arrayNames[1]]: item[arrayNames[1]]?.map(
                            (item, arrIndex) => {
                              return arrIndex === indices[1]
                                ? { ...item, ...dropdownClearObject }
                                : item;
                            }
                          ),
                        }
                      : item;
                  }
                ),
              }
            : { ...prevFormData, ...dropdownClearObject };
        return data;
      });

      // this.setFormData((prevFormData) => {
      //   let data = { ...prevFormData };

      //   if (
      //     Array.isArray(arrayNames) &&
      //     Array.isArray(indices) &&
      //     arrayNames.length === indices.length
      //   ) {
      //     // Traverse down the path
      //     let current = data;
      //     for (let i = 0; i < arrayNames.length - 1; i++) {
      //       const arrayName = arrayNames[i];
      //       const index = indices[i];
      //       if (Array.isArray(current[arrayName])) {
      //         current = current[arrayName][index];
      //       } else {
      //         return prevFormData;
      //       }
      //     }

      //     const lastArrayName = arrayNames[arrayNames.length - 1];
      //     const lastIndex = indices[indices.length - 1];

      //     if (
      //       Array.isArray(current[lastArrayName]) &&
      //       current[lastArrayName][lastIndex]
      //     ) {
      //       current[lastArrayName][lastIndex] = {
      //         ...current[lastArrayName][lastIndex],
      //         ...dropdownClearObject,
      //       };
      //     } else {
      //       return prevFormData;
      //     }
      //   } else {
      //     return prevFormData;
      //   }
      //   this.formData = data;

      //   return data;
      // });
    };

    // FUNCTION TO ADD PREFIX TO THE RESPONSE
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

    // UPDATE THE RESPONSE AS PER THE TABLE WIDGET REQUIREMENT
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

    convertDateSingle(
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

    convertDateSinglee(
      selectedDate,
      setFormData,
      fromAdToBs,
      fieldKey,
      arrayPath = "",
      index = []
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
        if (!prevFormData) return prevFormData;

        // 🔹 Clone formData deeply to avoid mutation issues
        const updatedFormData = structuredClone(prevFormData);

        // 🔹 Traverse to the correct level dynamically
        let currentLevel = updatedFormData;
        const pathParts = arrayPath.split(".");

        pathParts.forEach((part, level) => {
          if (!currentLevel[part]) return;
          const idx = index[level];

          if (Array.isArray(currentLevel[part]) && idx !== undefined) {
            currentLevel = currentLevel[part][idx]; // Move deeper
          }
        });

        if (currentLevel) {
          // 🔹 Update the target fields
          currentLevel[adField] = fromAdToBs ? selectedDate : convertedDate;
          currentLevel[bsField] = convertedDate;
        }
        this.formData = updatedFormData;
        return { ...updatedFormData }; // Ensure React re-renders
      });

      // 🔹 Trigger re-render if required
      this.setRenderFormKey((prevData) => prevData + 1);
    }

    convertDate(
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
        // 🔹 Clone the entire formData without losing reactivity
        const newData = structuredClone(prev); // Modern alternative to deep cloning

        let currentLevel = newData;
        pathParts.forEach((part, level) => {
          const idx = index[level];

          if (!currentLevel[part]) return;

          if (Array.isArray(currentLevel[part])) {
            currentLevel[part] = currentLevel[part].map((item, i) => {
              if (i === idx) {
                if (level === pathParts.length - 1) {
                  // 🔹 Prevent resetting when selectedDate is empty
                  if (selectedDate === "") return item;

                  const convertedDate = fromAdToBs
                    ? this.adToBs(selectedDate)
                    : this.bsToAd(selectedDate);

                  return {
                    ...item,
                    [adField]: fromAdToBs ? selectedDate : convertedDate,
                    [bsField]: fromAdToBs ? convertedDate : selectedDate,
                  };
                }
                return { ...item }; // 🔹 Ensures React detects the change
              }
              return item;
            });
          }

          currentLevel = currentLevel[part]?.[idx] || {};
        });
        this.formData = newData;
        return newData;
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
        salutation: "salutations",
        gender: "genders",
        nationality: "nationalities",
        dedup_identification: "document_types",
        permanent_country: "countries",
        permanent_province: "provinces",
        permanent_district: "districts",
        permanent_municipality: "local_bodies",
        current_country: "countries",
        current_province: "provinces",
        current_district: "districts",
        current_municipality: "local_bodies",
        family_member_relation: "relationships",
        id_type_id: "document_types",
        issue_country: "countries",
        issued_district_text: "countries",
        issued_district: "districts",
        issuing_authority: "issuing_authorities",
        pep_relationsip: "relationships",
        existing_risk_rating: "risk_categories",
        mobile_country_code: "country_codes",
        phone_country_code: "country_codes",
        relation_with_account_holder: "relationships",
        family_account_holder: "relationship_status",
        occupation_type: "occupations",
        source_of_income: "income_sources",
        business_type: "business_type",
        marital_status: "marital_status",
        constitution_code_id: "constitution_types",
        customer_type_id: "customer_types",
        national_id_issuing_authority: "issuing_authorities",
        national_id_issue_place: "districts",
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
          const newData = { ...prevFormData };
          let currentLevel = newData;
          const pathParts = arrayPath.split(".");

          pathParts.forEach((part, level) => {
            const idx = index[level];

            if (!currentLevel[part]) return;

            if (Array.isArray(currentLevel[part])) {
              currentLevel[part] = currentLevel[part].map((item, i) => {
                if (i === idx) {
                  if (level === pathParts.length - 1) {
                    return {
                      ...item,
                      [fieldName]: value ? "Family Not Available" : "",
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
      }, 100);
    }

    async calculateRisk(index) {
      try {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          related_party: {
            ...prevUiSchema.related_party,
            items: {
              ...prevUiSchema.related_party.items,
              calculate_risk: {
                ...prevUiSchema.related_party.items.calculate_risk,
                "ui:options": {
                  ...prevUiSchema.related_party.items.calculate_risk?.[
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
            ...this.formData?.related_party?.[index],
            category: "individual",
            id: this.case_id,
          }
        );

        if (response) {
          this.toast.success("Risk calculation successful");
          const resp = response?.data;

          this.setFormData((prevData) => ({
            ...prevData,
            related_party: prevData?.related_party?.map((item, idx) =>
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
        }

        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
      } finally {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          related_party: {
            ...prevUiSchema.related_party,
            items: {
              ...prevUiSchema.related_party.items,
              calculate_risk: {
                ...prevUiSchema.related_party.items.calculate_risk,
                "ui:options": {
                  ...prevUiSchema.related_party.items.calculate_risk?.[
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

    async calculateRiskOneLevel(index) {
      try {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          related_party: {
            ...prevUiSchema.related_party,
            items: {
              ...prevUiSchema.related_party.items,
              related_party_detail: {
                ...prevUiSchema.related_party.items.related_party_detail,
                items: {
                  ...prevUiSchema.related_party.items.related_party_detail
                    .items,
                  calculate_risk: {
                    ...prevUiSchema.related_party.items.related_party_detail
                      .items.calculate_risk,
                    "ui:options": {
                      ...prevUiSchema.related_party.items.related_party_detail
                        .items.calculate_risk?.["ui:options"],
                      show_loader: true,
                    },
                  },
                },
              },
            },
          },
        }));
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...this.formData?.related_party?.[index?.[0]]
              ?.related_party_detail?.[index?.[1]],
            category: "individual",
            id: this.case_id,
          }
        );

        if (response) {
          this.toast.success("Risk calculation successful");
          const resp = response?.data;
          this.setFormData((prevData) => ({
            ...prevData,
            related_party: prevData?.related_party?.map((item, i) =>
              i === index?.[0]
                ? {
                    ...item,
                    related_party_detail: item?.related_party_detail?.map(
                      (item, i) =>
                        i === index[1]
                          ? {
                              ...item,
                              calculate_risk: "true",
                              risk_level: resp?.risk_level,
                              risk_score: resp?.risk_score,
                            }
                          : item
                    ),
                  }
                : item
            ),
          }));
        }

        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
      } finally {
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          related_party: {
            ...prevUiSchema.related_party,
            items: {
              ...prevUiSchema.related_party.items,
              related_party_detail: {
                ...prevUiSchema.related_party.items.related_party_detail,
                items: {
                  ...prevUiSchema.related_party.items.related_party_detail
                    .items,
                  calculate_risk: {
                    ...prevUiSchema.related_party.items.related_party_detail
                      .items.calculate_risk,
                    "ui:options": {
                      ...prevUiSchema.related_party.items.related_party_detail
                        .items.calculate_risk?.["ui:options"],
                      show_loader: false,
                    },
                  },
                },
              },
            },
          },
        }));
      }
    }

    async initializeSchema(setJsonSchema, formData) {
      if (!this.form_status?.includes("case-init")) this.setDivide(true);

      const fieldsToUpdate = [
        "nationality",
        "dedup_identification",
        "permanent_country",
        "permanent_province",
        "permanent_district",
        "permanent_municipality",
        "current_country",
        "current_province",
        "current_district",
        "current_municipality",
        "family_member_relation",
        "id_type_id",
        "issue_country",
        "issued_district",
        "issuing_authority",
        "mobile_country_code",
        "phone_country_code",
        "pep_relationsip",
        "relation_with_account_holder",
        "family_account_holder",
        "occupation_type",
        "business_type",
        "salutation",
        "gender",
        "existing_risk_rating",
        "source_of_income",
        "marital_status",
        "issued_district_text",
        "constitution_code_id",
        "customer_type_id",
        "national_id_issuing_authority",
        "national_id_issue_place",
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

    async fetchRelatedPartyEnquiry(index, cif_id) {
      this.addLoader(["related_party", "cif_enquiry"], true);
      try {
        if (!(cif_id || this.formData?.related_party?.[index]?.cif_number)) {
          this.toast.error("Please enter a CIF Number");
          return;
        }
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number:
              this.formData?.related_party?.[index]?.cif_number ?? cif_id,
            form_title: "related_party",
            id: this.case_id,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data;
        if (resp)
          this.setFormData((prevFormData) => {
            const updatedDetails = [...prevFormData?.related_party];
            updatedDetails[index ?? 0] = {
              ...resp,

              designation: updatedDetails?.[index ?? 0]?.designation,
              has_cif: updatedDetails?.[index ?? 0]?.has_cif,
              cif_number: updatedDetails?.[index ?? 0]?.cif_number,
            };

            return {
              ...prevFormData,
              account_info: prevFormData?.account_info,
              cif_data: { ...prevFormData?.cif_data, related_party: resp },
              related_party: updatedDetails,
            };
          });

        // this.setUiSchema((prevSchema) => {
        //   const updatedUiSchema = { ...prevSchema.related_party.items };
        //   for (const key in resp) {
        //     // if (updatedUiSchema[key]) {
        //     const existing = updatedUiSchema[key];

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
        //     // }
        //   }

        //   return {
        //     ...prevSchema,
        //     related_party: {
        //       ...prevSchema?.related_party,
        //       items: updatedUiSchema,
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
        this.addLoader(["related_party", "cif_enquiry"], false);
      }
    }
    async fetchRelatedPartyEnquiryMultipleLayer(index, cif_id) {
      this.addLoaderMultiple(
        ["related_party", "related_party_detail", "cif_enquiry"],
        true
      );
      try {
        if (
          !(
            cif_id ||
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.cif_number
          )
        ) {
          this.toast.error("Please enter a CIF Number");
          return;
        }
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number:
              cif_id ??
              this.formData.related_party?.[index?.[0]]?.related_party_detail[
                index[1]
              ]?.cif_number,
            form_title: "related_party",
            id: this.case_id,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data;

        this.setFormData((prevFormData) => {
          const updatedFormData = {
            ...prevFormData,
            account_info: prevFormData?.account_info,
          };
          if (!updatedFormData.related_party) return prevFormData;

          const relatedParty = updatedFormData.related_party?.[index?.[0]];

          if (!relatedParty) return prevFormData;

          if (!relatedParty.related_party_detail) return prevFormData;

          const updatedRelatedPartyDetail = [
            ...relatedParty.related_party_detail,
          ];
          if (!updatedRelatedPartyDetail[index?.[1]]) return prevFormData;

          updatedRelatedPartyDetail[index?.[1]] = {
            ...resp,
            designation: updatedRelatedPartyDetail?.[index?.[1]]?.designation,
            has_cif: updatedRelatedPartyDetail?.[index?.[1]]?.has_cif,
            cif_number: updatedRelatedPartyDetail?.[index?.[1]]?.cif_number,
          };

          updatedFormData.related_party[index?.[0]] = {
            ...relatedParty,
            related_party_detail: updatedRelatedPartyDetail,
          };

          return updatedFormData;
        });
        // const path = [
        //   "related_party",
        //   index?.[0],
        //   "related_party_detail",
        //   index[1],
        // ];

        // this.disabledArray.push(index[1]);
        // this.setUiSchema((prevUiSchema) => {
        //   const updatedUiSchema = {
        //     ...prevUiSchema?.related_party?.items?.related_party_detail,
        //   };

        //   return {
        //     ...prevUiSchema,
        //     related_party: {
        //       ...prevUiSchema?.related_party,
        //       items: {
        //         ...prevUiSchema?.related_party?.items,
        //         related_party_detail: {
        //           ...prevUiSchema?.related_party?.items?.related_party_detail,
        //           "ui:options": {
        //             disabledArray: this.disabledArray,
        //           },
        //         },
        //       },
        //     },
        //   };
        // });

        // this.setUiSchema((prevUiSchema) => {
        //   const updatedUiSchema = {
        //     ...prevUiSchema?.related_party?.items?.related_party_detail?.items,
        //   };

        //   for (const key in resp) {
        //     // if (updatedUiSchema[key]) {
        //     const existing = updatedUiSchema[key];

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
        //     // }
        //   }

        //   return {
        //     ...prevUiSchema,
        //     related_party: {
        //       ...prevUiSchema?.related_party,
        //       items: {
        //         ...prevUiSchema?.related_party?.items,
        //         related_party_detail: {
        //           ...prevUiSchema?.related_party?.items?.related_party_detail,
        //           items: updatedUiSchema,
        //         },
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
        this.addLoaderMultiple(
          ["related_party", "related_party_detail", "cif_enquiry"],
          false
        );
      }
    }

    async fetchRelatedPartyInfoScreening(index) {
      if (
        !(
          this.formData?.related_party?.first_name ||
          this.formData?.related_party?.[index]?.first_name
        )
      ) {
        this.toast.error("Please enter a First Name");
        return;
      }
      this.addLoader(["related_party", "personal_info_screening"], true);
      try {
        let payload = {
          first_name:
            this.formData?.related_party?.first_name ||
            this.formData?.related_party?.[index]?.first_name,
          middle_name:
            this.formData?.related_party?.middle_name ||
            this.formData?.related_party?.[index]?.middle_name,
          last_name:
            this.formData?.related_party?.last_name ||
            this.formData?.related_party?.[index]?.last_name,
          father_name: this.formData?.related_party?.[index]?.father_name,
          identification_number:
            this.formData?.related_party?.[index]?.identification_number,
          blacklist_min_score:
            this.formData?.related_party?.[index]?.blacklist_min_score,
          sanction_min_score:
            this.formData?.related_party?.[index]?.sanction_min_score,
          pep_min_score: this.formData?.related_party?.[index]?.pep_min_score,
          adverse_media_min_score:
            this.formData?.related_party?.[index]?.adverse_media_min_score,
          max_result: this.formData?.related_party?.[index]?.max_result,
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
          related_party: prevData?.related_party?.map((item, i) =>
            i === index
              ? {
                  ...item,
                  personal_info_screening: "true",
                  personal_screening_data: this.preprocessData(resp),
                }
              : item
          ),
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
        this.addLoader(["related_party", "personal_info_screening"], false);
      }
    }

    async fetchRelatedPartyInfoScreeningMultipleLayer(index) {
      if (
        !(
          this.formData.related_party?.[index?.[0]]?.related_party_detail
            ?.first_name ||
          this.formData.related_party?.[index?.[0]]?.related_party_detail[
            index[1]
          ]?.first_name
        )
      ) {
        this.toast.error("Please enter a First Name");
        return;
      }
      this.addLoaderMultiple(
        ["related_party", "related_party_detail", "personal_info_screening"],
        true
      );

      try {
        let payload = {
          first_name:
            this.formData.related_party?.[index?.[0]]?.related_party_detail
              ?.first_name ||
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.first_name,
          middle_name:
            this.formData.related_party?.[index?.[0]]?.related_party_detail
              ?.middle_name ||
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.middle_name,
          last_name:
            this.formData.related_party?.[index?.[0]]?.related_party_detail
              ?.last_name ||
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.last_name,
          father_name:
            this.formData.related_party?.[index?.[0]]?.related_party_detail
              ?.father_name ||
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.father_name,
          identification_number:
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.identification_number,
          blacklist_min_score:
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.blacklist_min_score,
          sanction_min_score:
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.sanction_min_score,
          pep_min_score:
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.pep_min_score,
          adverse_media_min_score:
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.adverse_media_min_score,
          max_result:
            this.formData.related_party?.[index?.[0]]?.related_party_detail[
              index[1]
            ]?.max_result,
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
          related_party: prevData?.related_party?.map((item, i) =>
            i === index?.[0]
              ? {
                  ...item,
                  related_party_detail: item?.related_party_detail?.map(
                    (item, i) =>
                      i === index[1]
                        ? {
                            ...item,
                            personal_info_screening: "true",
                            personal_screening_data: this.preprocessData(resp),
                          }
                        : item
                  ),
                }
              : item
          ),
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
        this.addLoaderMultiple(
          ["related_party", "related_party_detail", "personal_info_screening"],
          false
        );
      }
    }

    async updateFormAndSchema(formData, schemaConditions) {
      // if (
      //   this.formData?.related_party?.length !==
      //     formData?.related_party?.length ||
      //   this.formData?.related_party?.[0]?.related_party_detail?.length !==
      //     formData?.related_party?.[0]?.related_party_detail?.length ||
      //   this.formData?.related_party?.[1]?.related_party_detail?.length !==
      //     formData?.related_party?.[0]?.related_party_detail?.length
      // )
      //   this.nationalityChanged = true;
      this.formData = formData;
    }

    createUISchema(options) {
      const {
        setJsonSchema,
        formData,
        setFormData,
        jsonSchema,
        ObjectFieldTemplate,
        ArrayFieldTemplate,
        widgets,
      } = options;

      // !(
      //   this.form_status?.includes("review") ??
      //   this.form_status?.includes("Completed")
      // ) && (this.nationalityChanged = true);
      const sameAsPermanentOnChange = (value, index) => {
        setTimeout(
          () =>
            this.setFormData((prevFormData) => {
              const updatedJointDetails = [...prevFormData.related_party];

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
                  same_as_permanent: undefined,
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

              return { ...prevFormData, related_party: updatedJointDetails };
            }),
          100
        );
      };
      const sameAsPermanentOnChangeMultiple = (value, index) => {
        setTimeout(() => {
          this.setFormData((prevFormData) => {
            const updatedFormData = { ...prevFormData };
            const relatedParties = [...(prevFormData?.related_party || [])];

            const partyIdx = index?.[0];
            const detailIdx = index[1];

            const relatedParty = relatedParties[partyIdx];
            const partyDetails = [
              ...(relatedParty?.related_party_detail || []),
            ];

            const currentDetail = { ...partyDetails[detailIdx] };

            const defaultCountry = "NP";

            if (value) {
              // Copy permanent address values to current
              partyDetails[detailIdx] = {
                ...currentDetail,
                same_as_permanent: true,
                current_country:
                  currentDetail.permanent_country || defaultCountry,
                current_province: currentDetail.permanent_province || null,
                current_district: currentDetail.permanent_district || null,
                current_municipality:
                  currentDetail.permanent_municipality || null,
                current_ward_number: currentDetail.permanent_ward_number || "",
                current_street_name: currentDetail.permanent_street_name || "",
                current_town: currentDetail.permanent_town || "",
                current_house_number:
                  currentDetail.permanent_house_number || "",
                current_outside_town:
                  currentDetail.permanent_outside_town || "",
                current_outside_street_name:
                  currentDetail.permanent_outside_street_name || "",
                current_postal_code: currentDetail.permanent_postal_code || "",
              };
            } else {
              // Clear current address fields
              partyDetails[detailIdx] = {
                ...currentDetail,
                same_as_permanent: undefined,
                current_country: defaultCountry,
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

            relatedParties[partyIdx] = {
              ...relatedParty,
              related_party_detail: partyDetails,
            };

            updatedFormData.related_party = relatedParties;
            return updatedFormData;
          });
        }, 100);
      };
      const handleLastNameNotAvailableChange = (
        fieldName,
        value,
        arrayPath,
        index
      ) => {
        this.setFormData((prevFormData) => {
          const updatedRelatedPartyDetails = [...prevFormData[arrayPath]];
          updatedRelatedPartyDetails[index] = {
            ...updatedRelatedPartyDetails[index],
            [fieldName]: value ? "N/A" : "",
          };

          return {
            ...prevFormData,
            [arrayPath]: updatedRelatedPartyDetails,
          };
        });
      };

      const handleEmailNotAvailableChange = (
        fieldName,
        value,
        arrayPath,
        index
      ) => {
        setTimeout(() => {
          this.setFormData((prevFormData) => {
            const updatedRelatedPartyDetails = [...prevFormData[arrayPath]];
            updatedRelatedPartyDetails[index] = {
              ...updatedRelatedPartyDetails[index],
              [fieldName]: value ? "N/A" : "",
            };

            return {
              ...prevFormData,
              [arrayPath]: updatedRelatedPartyDetails,
            };
          });
        }, 100);
      };

      const ChangeFiledToDot = (fieldName, value, arrayPath, index) => {
        setTimeout(() => {
          this.setFormData((prevFormData) => {
            const newData = { ...prevFormData };
            let currentLevel = newData;
            const pathParts = arrayPath.split(".");

            pathParts.forEach((part, level) => {
              const idx = index[level];

              if (!currentLevel[part]) return;

              if (Array.isArray(currentLevel[part])) {
                currentLevel[part] = currentLevel[part].map((item, i) => {
                  if (i === idx) {
                    if (level === pathParts.length - 1) {
                      return {
                        ...item,
                        [fieldName]: value ? "N/A" : "",
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
        }, 100);
      };

      this.initializeSchema(setJsonSchema, formData);
      return {
        "ui:order": [
          "has_related_party",
          "related_party",
          "account_info",
          "cif_data",
        ],
        account_info: {
          "ui:widget": "hidden",
        },
        cif_data: {
          "ui:widget": "hidden",
        },
        has_related_party: {
          "ui:options": {
            onChange: (value) => {
              this.dropdownReset({ has_related_party: value });
            },
          },
        },
        related_party: {
          "ui:options": {
            addable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval")
            ),
            orderable: false,
            removable: !(
              this.form_status?.includes("review") ||
              this.form_status?.includes("approval")
            ),
          },

          items: {
            "ui:order": [
              "designation",
              "related_party_detail",
              "has_cif",
              "cif_number",
              "cif_enquiry",

              "salutation",
              "first_name",
              "middle_name",
              "last_name",
              "last_name_not_available",
              "father_name",
              "date_of_birth_ad",
              "date_of_birth_bs",
              "nationality",
              "dedup_identification",
              "dedup_id_number",
              "relation_with_account_holder",
              "gender",
              "marital_status",
              "email",
              "email_not_available",
              "family_account_holder",

              "dedup_check",
              "dedup_module_data",

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
              "risk_level",
              "calculate_risk",
              "risk_score",
            ],

            is_customer_disabled: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
            },

            nid_verify: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
              "ui:label": false,
              "ui:classNames": "mt-5 w-100",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[index]?.national_id_number,
                buttonClassName: "w-100",
                onClick: async (index, formData) => {
                  let nidVerifiedValue = "No";
                  this.addLoader(["related_party", "nid_verify"], true);
                  try {
                    const response = await this.axios.post(
                      `${this.mainRouteURL}/external-api/verify-nid`,
                      {
                        nin: formData?.related_party?.[index]
                          ?.national_id_number,
                        first_name:
                          formData?.related_party?.[index]?.first_name,
                        last_name: formData?.related_party?.[index]?.last_name,
                        middle_name:
                          formData?.related_party?.[index]?.middle_name,
                        date_of_birth:
                          formData?.related_party?.[index]?.date_of_birth_ad,
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
                    this.addLoader(["related_party", "nid_verify"], false);
                    this.setFormData((prevForm) => ({
                      ...prevForm,
                      related_party: prevForm?.related_party?.map((item, idx) =>
                        index === idx
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
                  !formData?.related_party?.[index]?.nid_verified,
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
                    "related_party",
                    index
                  );
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
                minimumDate: (formData, index) => {
                  return (
                    formData?.related_party?.[index]?.date_of_birth_ad &&
                    this.moment(
                      formData?.related_party?.[index]?.date_of_birth_ad
                    )
                      .add(1, "day")
                      .format("YYYY-MM-DD")
                  );
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "national_id_issue_date_ad",
                    "related_party",
                    index ? index : 0
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
                minimumDate: (formData, index) => {
                  return (
                    formData?.related_party?.[index]?.date_of_birth_bs &&
                    this.moment(
                      formData?.related_party?.[index]?.date_of_birth_bs
                    ).format("YYYY-MM-DD")
                  );
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    false,
                    "national_id_issue_date_bs",
                    "related_party",
                    index ? index : 0
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
            relation_with_account_holder: {},
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
                          related_party: prev?.related_party?.map((item, idx) =>
                            idx === index
                              ? {
                                  account_info: item?.account_info,
                                  designation: item?.designation,
                                }
                              : item
                          ),
                        };
                      }),
                    100
                  ),
              },
            },
            connectedPairs: [
              ["last_name", "last_name_not_available"],
              ["email", "email_not_available"],
            ],
            same_as_permanent: {
              "ui:widget": "hidden",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) =>
                  sameAsPermanentOnChange(value, index ?? 0),
              },
            },
            risk_score: {
              "ui:widget": "hidden",
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

            designation: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  const newSelectedData = formData?.related_party
                    ?.map((item, idx) =>
                      idx !== index ? item?.designation : null
                    )
                    .filter(Boolean);
                  const filterOption = ["Power of Attorney", "Mandatee"]
                    .map((item) => ({
                      label: item,
                      value: item,
                    }))
                    ?.filter((item) => !newSelectedData?.includes(item?.value));
                  return filterOption;
                },
                onChange: (value, index) => {
                  this.dropdownReset(
                    { designation: value },
                    "related_party",
                    index
                  );
                },
              },
            },

            dedup_identification: {
              // "ui:widget": "CascadeDropdown",
              "ui:options": {
                setDisabled: () => {
                  return false;
                },
                //   formData?.related_party?.[index]?.nationality !== "IN",
                // getOptions: (formData, index) => {
                //   if (
                //     formData?.related_party?.[index]?.dedup_identification &&
                //     this.nationalityChanged === true
                //   ) {
                //     const clone = JSON.parse(JSON.stringify(formData));
                //     const value =
                //       clone?.related_party?.[index]?.dedup_identification;

                //     this.convertToArray(
                //       value,
                //       "id_type_id",
                //       "id_type_details",
                //       ["dedup_identification", "id_type_id"],
                //       index ?? 0,
                //       "related_party"
                //     );

                //     this.nationalityChanged = false;
                //   }

                //   const d = this.functionGroup?.getRequiredDocuments(
                //     this.optionsData["multi_validation_mapping"],
                //     {
                //       nationality:
                //         formData?.related_party?.[index ?? 0]?.nationality,
                //       account_type: formData?.account_info,
                //     }
                //   );

                //   return d;
                // },

                onChange: async (value, index, id) => {
                  await this.dropdownReset({ dedup_identification: "" });
                  await this.convertToArray(
                    value,
                    "id_type_id",
                    "id_type_details",
                    ["dedup_identification", "id_type_id"],
                    index ?? 0,
                    "related_party"
                  );
                },
              },
            },
            customer_type_id: {
              "ui:options": {},
            },

            nationality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  return this.filterOptions("nationalities");
                },
                onChange: async (value, index) => {
                  this.dropdownReset(
                    {
                      nationality: value,
                      dedup_id_number: "",
                      dedup_identification:
                        value === "NP" ? "CTZN" : value === "IN" ? null : "PP",
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
                    "related_party",
                    index
                  );
                  (await value) !== "IN" && (this.nationalityChanged = true);
                  return null;
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
                    "related_party"
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
                    "related_party"
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
                disableButton: (formData, index) =>
                  !(
                    formData?.related_party?.[index]?.first_name?.trim() &&
                    formData?.related_party?.[index]?.last_name?.trim() &&
                    formData?.related_party?.[index]?.father_name?.trim() &&
                    formData?.related_party?.[index]?.date_of_birth_ad &&
                    formData?.related_party?.[index]?.date_of_birth_bs &&
                    formData?.related_party?.[index]?.dedup_identification &&
                    formData?.related_party?.[index]?.dedup_id_number
                  ),
                onClick: (index) => {
                  this.getDedupCheck(index);
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
                  this.form_status?.includes("Completed")) && ["match"],
                actionHandlers: {
                  ...(!(
                    this.form_status?.includes("review") ||
                    this.form_status?.includes("approval") ||
                    this.form_status?.includes("Completed")
                  ) && {
                    match: (record, index) => {
                      if (record?.cif_number !== "-") {
                        this.setFormData((prev) => ({
                          ...prev,
                          related_party: prev?.related_party?.map((item, idx) =>
                            idx === index
                              ? {
                                  ...item,
                                  has_cif: true,
                                  cif_number: record?.cif_number,
                                }
                              : item
                          ),
                        }));
                        this.fetchRelatedPartyEnquiry(
                          index ?? 0,
                          record?.cif_number
                        );
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
                "ui:ObjectFieldTemplate": ObjectFieldTemplate,
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
                  "ui:placeholder": "Enter Full Name",
                  "ui:options": {
                    setDisabled: (formData, index) =>
                      this.form_status.includes("init") ||
                      this.form_status.includes("update")
                        ? (formData?.related_party?.[index?.[0]]
                            ?.family_information?.[index?.[1]]
                            ?.family_member_relation === "FATHE" &&
                            formData?.related_party?.[index?.[0]]
                              ?.father_name) ||
                          formData?.related_party?.[index?.[0]]
                            ?.family_information?.[index?.[1]]
                            ?.is_family_name_not_available
                        : true,
                  },
                },

                is_family_name_not_available: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:options": {
                    setDisabled: (formData, index) =>
                      this.form_status.includes("init") ||
                      this.form_status.includes("update")
                        ? formData?.related_party?.[index?.[0]]
                            ?.family_information?.[index?.[1]]
                            ?.family_member_relation === "FATHE" &&
                          formData?.related_party?.[index?.[0]]?.father_name !==
                            ""
                          ? true
                          : false
                        : true,

                    onChange: (value, index) => {
                      this.familyNameChange(
                        "family_member_full_name",
                        value,
                        "related_party.family_information",
                        index ?? 0
                      );
                    },
                  },
                },
              },
            },

            gender: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   getOptions: (formData, index) => {
              //     return this.filterOptions(
              //       "genders",
              //       formData?.related_party &&
              //         formData?.related_party?.[index]?.salutation
              //     );
              //   },
              // },
            },
            last_name_not_available: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,

              "ui:options": {
                onChange: (value, index) => {
                  handleLastNameNotAvailableChange(
                    "last_name",
                    value,
                    "related_party",
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
                    "related_party",
                    index ?? 0
                  );
                },
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
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "date_of_birth_ad",
                    "related_party",
                    index ? index : 0
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
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    false,
                    "date_of_birth_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },

            id_type_details: {
              "ui:options": {
                addable: !(
                  this.form_status?.includes("review") ||
                  this.form_status?.includes("approval") ||
                  this.form_status?.includes("Completed")
                ),
                orderable: false,
                removable: !(
                  this.form_status?.includes("review") ||
                  this.form_status?.includes("approval") ||
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
                  "visa_type",
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
                id_type_id: {
                  // "ui:widget": "CascadeDropdown",
                  // "ui:options": {
                  //   getOptions: (formData, index) => {
                  //     setTimeout(
                  //       () =>
                  //         this.setFormData((prev) => ({
                  //           ...prev,
                  //           related_party: prev.related_party?.map(
                  //             (relatedParty) => ({
                  //               ...relatedParty,
                  //               id_type_details:
                  //                 relatedParty?.id_type_details?.map(
                  //                   (item) => ({
                  //                     ...item,
                  //                     ...(item?.id_type_id && {
                  //                       disable: true,
                  //                     }),
                  //                     ...(item?.id_type_id && {
                  //                       issue_country: item?.issue_country
                  //                         ? item?.issue_country
                  //                         : relatedParty?.nationality === "NP" // Nepalese
                  //                         ? "NP" // Nepal
                  //                         : relatedParty?.nationality ===
                  //                           "fc427fcf-290d-4ef1-8048-1af42ba3f02c" // Chinese
                  //                         ? "CN" // China
                  //                         : relatedParty?.nationality ===
                  //                           "47ea7bb9-7fa8-4441-a1fc-0f8b79812268" // American
                  //                         ? "US" // USA
                  //                         : relatedParty?.nationality ===
                  //                           "bec5d07d-42fe-4fcf-a945-51b23465f31a" // Korean
                  //                         ? "KR" // Republic
                  //                         : relatedParty?.nationality === "IN"
                  //                         ? "IN"
                  //                         : item?.issue_country ?? null,
                  //                     }),
                  //                   })
                  //                 ),
                  //             })
                  //           ),
                  //         })),
                  //       100
                  //     );
                  //     const newSelectedData = formData?.related_party?.[
                  //       index?.[0]
                  //     ]?.id_type_details?.map((item, idx) =>
                  //       idx !== index ? item?.id_type_id : null
                  //     );
                  //     const filterOption =
                  //       this.functionGroup?.getRequiredDocuments(
                  //         this.optionsData["multi_validation_mapping"],
                  //         {
                  //           nationality:
                  //             formData?.related_party?.[index?.[0]]
                  //               ?.nationality,
                  //           account_type: formData?.account_info,
                  //         }
                  //       );
                  //     const currentSelectedValue =
                  //       formData?.related_party?.[index?.[0]]
                  //         ?.id_type_details?.[index?.[1]]?.id_type_id;
                  //     const dropdownOptions = filterOption?.filter((item) => {
                  //       if (!item || !item.value || item.value.trim() === "")
                  //         return false;
                  //       return (
                  //         item.value === currentSelectedValue ||
                  //         !newSelectedData?.includes(item.value)
                  //       );
                  //     });
                  //     return dropdownOptions || [];
                  //   },
                  // },
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
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:options": {
                    name: "id_issued_date_ad",
                    enforceAgeRestriction: false,
                    validAge: 0,
                    disableFutureDates: true,
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.related_party?.[
                        index?.[0]
                      ]?.id_type_details?.map((item) =>
                        this.moment(
                          formData?.related_party?.[index?.[0]]
                            ?.date_of_birth_ad
                        )
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
                        index,
                        "id_issued_date",
                        "related_party.id_type_details"
                      );
                    },
                  },
                },

                id_issued_date_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:options": {
                    enforceAgeRestriction: true,
                    name: "id_issued_date_bs",
                    disableFutureDates: true,
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.related_party[
                        index?.[0]
                      ]?.id_type_details?.map((item) =>
                        this.NepaliDate.parseEnglishDate(
                          this.moment(
                            formData?.related_party?.[index?.[0]]
                              ?.date_of_birth_ad
                          )
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
                        index,
                        "id_issued_date",
                        "related_party.id_type_details"
                      );
                    },
                  },
                },

                id_expiry_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Issued Date (A.D)",
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:options": {
                    name: "id_expiry_date_ad",
                    enforceAgeRestriction: false,
                    validAge: 0,
                    enableFutureDates: true,

                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "id_expiry_date",
                        "related_party.id_type_details"
                      );
                    },
                  },
                },
                id_expiry_date_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:options": {
                    validAge: 0,
                    enforceAgeRestriction: true,
                    name: "id_expiry_date_bs",
                    enableFutureDates: true,

                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        false,
                        index,
                        "id_expiry_date",
                        "related_party.id_type_details"
                      );
                    },
                  },
                },

                // issuing_authority: {
                //   "ui:options": {
                //     setDisabled: (formData, index) => {
                //       const document_types = {
                //         citizenship_number:
                //           "CTZN",
                //         passport: "PP",
                //         driving_license: "LCNSE",
                //         voter_id: "VOTER",
                //         nid: "NID",
                //         embassy: "EMBSY",
                //       };
                //       const issuing_authorities = {
                //         citizenship_number:
                //           "DAO",
                //         passport: "DAO",
                //         driving_license: "NA",
                //         voter_id: "a4e3fa6d-133d-40da-8996-444207b7f2a2",
                //         nid: "DONICR",
                //         embassy: "5db16d6d-63ea-4ff1-a8d3-0ffdf38a2773",
                //       };

                //       const currentIdType =
                //         formData?.related_party?.[index?.[0]]?.id_type_details?.[
                //           index[1]
                //         ]?.id_type_id;

                //       const matchingDocType = Object.entries(
                //         document_types
                //       ).find(([_, value]) => value === currentIdType);

                //       // if (matchingDocType) {
                //       //   const [docTypeKey] = matchingDocType;
                //       //   setFormData((prev) => ({
                //       //     ...prev,
                //       //     related_party: prev?.related_party?.map((item, idx) =>
                //       //       idx === index?.[0]
                //       //         ? {
                //       //             ...item,
                //       //             issuing_authority:
                //       //               issuing_authorities[docTypeKey],
                //       //           }
                //       //         : item
                //       //     ),
                //       //   }));
                //       //   return true;
                //       //   // return issuing_authorities[docTypeKey];
                //       // }

                //       return false;
                //     },
                //   },
                // },
                issued_district: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      const identification =
                        formData?.related_party?.[index?.[0]]
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
                        formData?.related_party?.[index?.[0]]
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
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:placeholder": "Select Visa Issued Date (A.D)",
                  "ui:options": {
                    enforceAgeRestriction: false,
                    disableFutureDates: true,
                    validAge: 0,
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.related_party?.[
                        index?.[0]
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
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:placeholder": "Select Visa Expiry Date (A.D)",
                  "ui:options": {
                    enforceAgeRestriction: false,
                    minDate: 0,
                    enableFutureDates: true,
                  },
                },
                // visa_issued_date_ad: {
                //   "ui:placeholder": "Select Visa Issued Date (A.D)",
                //   "ui:options": {
                //     enforceAgeRestriction: false,
                //     minDate: 0,
                //     disableFutureDates: true,
                //     onDateChange: (selectedDate, index) => {
                //       this.convertDate(
                //         selectedDate,
                //         setFormData,
                //         true,
                //         index,
                //         "related_party_visa_issued_date",
                //         "related_party.id_type_details"
                //       );
                //     },
                //   },
                // },
                // visa_expiry_date_ad: {
                //   "ui:placeholder": "Select Visa Expiry Date (A.D)",
                //   "ui:options": {
                //     enforceAgeRestriction: false,
                //     minDate: 0,
                //     enableFutureDates: true,
                //     onDateChange: (selectedDate, index) => {
                //       this.convertDate(
                //         selectedDate,
                //         setFormData,
                //         true,
                //         index,
                //         "related_party_visa_expiry_date",
                //         "related_party.id_type_details"
                //       );
                //     },
                //   },
                // },
                visa_type: {
                  "ui:placeholder": "Select Visa Type",
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

            salutation: {
              "ui:widget": "CustomRadioWidget",
              // "ui:label": false,
              // "ui:options": {
              //   getOptions: (formData) => {
              //     return this.filterOptions(
              //       "salutations",
              //       formData?.account_info
              //     );
              //   },
              //   onChange: (value, index) => {
              //     this.dropdownReset(
              //       {
              //         salutation: value,
              //         gender: null,
              //       },
              //       "related_party",
              //       index ?? 0
              //     );
              //   },
              // },
            },

            cif_enquiry: {
              "ui:widget": "ButtonField",
              "ui:label": false,
              "ui:classNames": "d-flex h-100 mt-5 align-items-center",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[index]?.cif_number?.trim(),

                onClick: (index) => {
                  setTimeout(
                    () =>
                      setFormData((prev) => ({
                        ...prev,
                        related_party: prev?.related_party?.map((item, idx) =>
                          idx === index
                            ? {
                                designation: item?.designation,
                                account_info: item?.account_info,
                                has_cif: item?.has_cif,
                                cif_number: item?.cif_number,
                              }
                            : item
                        ),
                      })),
                    100
                  ),
                    this.fetchRelatedPartyEnquiry(index ?? 0);
                },
              },
            },
            personal_screening_data: {
              "ui:widget": "ScreeningReportCard",
              "ui:label": false,
              showCheckbox: true,
              showActionText: true,
              fixedActionsColumn: true,
              showFooter: true,
              "ui:options": {
                onCheckboxChange: (tableData, category, checked, index) => {
                  this.setFormData((prevData) => ({
                    ...prevData,
                    related_party: prevData?.related_party?.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            [category === "pep_nba"
                              ? "pep"
                              : category === "sanction_moha"
                              ? "sanction"
                              : category]: checked ? "Yes" : "No",
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
            screening_filter: {
              "ui:widget":
                /* this.form_status?.includes("init")
                ? "ButtonField"
                :  */ "hidden",
              "ui:label": false,
              "ui:options": {
                disableButton: (formData) => {
                  let requiredFields = jsonSchema.required || [];

                  const allFilled = requiredFields.every((field) => {
                    const value = formData?.[field];

                    return (
                      value !== undefined && value !== null && value !== ""
                    );
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
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[index]?.first_name?.trim(),
                onClick: (index) => {
                  this.fetchRelatedPartyInfoScreening(index ?? 0);
                },
              },
            },
            permanent_province: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions("provinces");
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      permanent_province: value,
                      permanent_district: null,
                      permanent_municipality: null,
                      permanent_ward_number: "",
                      permanent_street_name: "",
                      permanent_town: "",
                      permanent_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            permanent_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "districts",

                    formData.related_party?.[index]?.permanent_province
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      permanent_district: value,
                      permanent_municipality: null,
                      permanent_ward_number: "",
                      permanent_street_name: "",
                      permanent_town: "",
                      permanent_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            permanent_municipality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "local_bodies",

                    formData.related_party?.[index]?.permanent_district
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      permanent_municipality: value,
                      permanent_ward_number: "",
                      permanent_street_name: "",
                      permanent_town: "",
                      permanent_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            occupation_type: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => this.filterOptions("occupations"),
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      occupation_type: value,
                      source_of_income: null,
                    },
                    "related_party",
                    index
                  ),
              },
            },

            occupation_detail: {
              "ui:classNames": "my-1",
              "ui:options": {
                addable: !(
                  this.form_status?.includes("review") ||
                  this.form_status?.includes("approval") ||
                  this.form_status?.includes("Completed")
                ),
                orderable: false,
                removable: !(
                  this.form_status?.includes("review") ||
                  this.form_status?.includes("approval") ||
                  this.form_status?.includes("Completed")
                ),
              },
              items: {
                designation: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => this.filterOptions("corporate_relation"),
                  },
                },
              },
            },
            screening_ref_code: {
              "ui:widget": "hidden",
              "ui:label": false,
            },
            related_party_detail: {
              "ui:options": {
                addable: !(
                  this.form_status?.includes("review") ||
                  this.form_status?.includes("approval")
                ),
                orderable: false,
                removable: !(
                  this.form_status?.includes("review") ||
                  this.form_status?.includes("approval")
                ),
              },
              items: {
                "ui:order": [
                  "designation",
                  "has_cif",
                  "cif_number",
                  "cif_enquiry",
                  "customer_type_id",
                  "customer_status",
                  "salutation",
                  "first_name",
                  "middle_name",
                  "last_name",
                  "last_name_not_available",
                  "father_name",
                  "date_of_birth_ad",
                  "date_of_birth_bs",
                  "nationality",
                  "dedup_identification",
                  "dedup_id_number",
                  "relation_with_account_holder",

                  "dedup_check",
                  "dedup_module_data",
                  "gender",
                  "marital_status",
                  "email",
                  "email_not_available",
                  "family_account_holder",

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
                  "risk_level",
                  "calculate_risk",
                  "risk_score",
                ],
                "ui:ObjectFieldTemplate": ObjectFieldTemplate,
                is_customer_disabled: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:label": false,
                },

                nid_verify: {
                  "ui:widget": this.form_status?.includes("init")
                    ? "ButtonField"
                    : "hidden",
                  "ui:label": false,
                  "ui:classNames": "mt-5 w-100",
                  "ui:options": {
                    disableButton: (formData, index) =>
                      !formData?.related_party?.[index?.[0]]
                        ?.related_party_detail[index[1]]?.national_id_number,
                    buttonClassName: "w-100",
                    onClick: async (index, formData) => {
                      let nidVerifiedValue = "No";
                      this.addLoaderMultiple(
                        ["related_party", "related_party_detail", "nid_verify"],
                        true
                      );
                      try {
                        const response = await this.axios.post(
                          `${this.mainRouteURL}/external-api/verify-nid`,
                          {
                            nin: formData?.related_party?.[index?.[0]]
                              ?.related_party_detail[index[1]]
                              ?.national_id_number,
                            first_name:
                              formData?.related_party?.[index?.[0]]
                                ?.related_party_detail[index[1]]?.first_name,
                            last_name:
                              formData?.related_party?.[index?.[0]]
                                ?.related_party_detail[index[1]]?.last_name,
                            middle_name:
                              formData?.related_party?.[index?.[0]]
                                ?.related_party_detail[index[1]]?.middle_name,
                            date_of_birth:
                              formData?.related_party?.[index?.[0]]
                                ?.related_party_detail[index[1]]
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
                        this.addLoaderMultiple(
                          [
                            "related_party",
                            "related_party_detail",
                            "nid_verify",
                          ],
                          false
                        );

                        this.setFormData((prevForm) => ({
                          ...prevForm,
                          related_party: prevForm?.related_party?.map(
                            (item, idx) =>
                              index[0] === idx
                                ? {
                                    ...item,
                                    related_party_detail:
                                      item?.related_party_detail?.map(
                                        (data, idx2) =>
                                          index[1] == idx2
                                            ? {
                                                ...data,
                                                nid_verified: nidVerifiedValue,
                                              }
                                            : data
                                      ),
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
                      !formData?.related_party?.[index?.[0]]
                        ?.related_party_detail[index[1]]?.nid_verified,
                    buttonClassName: "w-100",
                    onClick: async (index) => {
                      this.dropdownResetMultipleLayer(
                        {
                          national_id_number: null,
                          national_id_issue_date_ad: "",
                          national_id_issue_date_bs: "",
                          national_id_issue_place: "",
                          nid_verified: "",
                        },
                        ["related_party", "related_party_detail"],
                        index
                      );
                    },
                  },
                },
                national_id_issue_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:placeholder": "Select Issued Date (A.D)",
                  "ui:options": {
                    enforceAgeRestriction: false,
                    validAge: 0,
                    name: "national_id_issue_date_ad",
                    enforceAgeRestriction: true,
                    disableFutureDates: true,
                    minimumDate: (formData, index) => {
                      return (
                        formData?.related_party?.[index?.[0]]
                          ?.related_party_detail[index[1]]?.date_of_birth_ad &&
                        this.moment(
                          formData?.related_party?.[index?.[0]]
                            ?.related_party_detail[index[1]]?.date_of_birth_ad
                        )
                          .add(1, "day")
                          .format("YYYY-MM-DD")
                      );
                    },
                    onDateChange: (selectedDate, index) => {
                      this.convertDateSinglee(
                        selectedDate,
                        setFormData,
                        true,
                        "national_id_issue_date_ad",
                        "related_party.related_party_detail",
                        index ? index : 0
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
                    minimumDate: (formData, index) => {
                      return (
                        formData?.related_party?.[index?.[0]]
                          ?.related_party_detail[index[1]]?.date_of_birth_bs &&
                        this.moment(
                          formData?.related_party?.[index?.[0]]
                            ?.related_party_detail[index[1]]?.date_of_birth_bs
                        ).format("YYYY-MM-DD")
                      );
                    },
                    onDateChange: (selectedDate, index) => {
                      this.convertDateSinglee(
                        selectedDate,
                        setFormData,
                        false,
                        "national_id_issue_date_bs",
                        "related_party.related_party_detail",
                        index ? index : 0
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
                designation: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      const newSelectedData = formData?.related_party
                        ?.map((item, idx) =>
                          idx !== index ? item?.designation : null
                        )
                        .filter(Boolean);
                      const filterOption = ["Power of Attorney", "Mandatee"]
                        .map((item) => ({
                          label: item,
                          value: item,
                        }))
                        ?.filter(
                          (item) => !newSelectedData?.includes(item?.value)
                        );
                      return filterOption;
                    },
                    onChange: (value, index) => {
                      // this.nationalityChanged = true;
                      this.dropdownResetMultipleLayer(
                        { designation: value },
                        ["related_party", "related_party_detail"],
                        index
                      );
                    },
                  },
                },
                customer_type_id: {},

                relation_with_account_holder: {},
                has_cif: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:label": false,
                  "ui:options": {
                    onChange: (value, index) => {
                      !value &&
                        setTimeout(
                          () =>
                            setFormData((prev) => {
                              return {
                                ...prev,
                                related_party: prev?.related_party?.map(
                                  (item, idx) =>
                                    idx === index?.[0]
                                      ? {
                                          ...item,
                                          related_party_detail:
                                            item?.related_party_detail?.map(
                                              (item2, idx2) =>
                                                idx2 === index?.[1]
                                                  ? {
                                                      account_info:
                                                        item?.account_info,

                                                      designation:
                                                        item2?.designation,
                                                    }
                                                  : item2
                                            ),
                                        }
                                      : item
                                ),
                              };
                            }),
                          100
                        );
                    },
                  },
                },
                screening_ref_code: {
                  "ui:widget": "hidden",
                  "ui:label": false,
                },
                risk_score: {
                  "ui:widget": "hidden",
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
                      this.calculateRiskOneLevel(index ?? [0, 0]);
                    },
                  },
                },
                same_as_permanent: {
                  "ui:widget": "hidden",
                  "ui:label": false,
                  "ui:options": {
                    onChange: (value, index) =>
                      sameAsPermanentOnChangeMultiple(value, index ?? [0, 0]),
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
                connectedPairs: [
                  ["last_name", "last_name_not_available"],
                  ["email", "email_not_available"],
                ],

                dedup_identification: {
                  // "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    // setDisabled: (formData, index) =>
                    //   formData?.related_party?.[index?.[0]]
                    //     ?.related_party_detail?.[index?.[1]]?.nationality !==
                    //   "IN",
                    // getOptions: (formData, index) => {
                    //   if (
                    //     formData?.related_party?.[index?.[0]]
                    //       ?.related_party_detail?.[index?.[1]]
                    //       ?.dedup_identification &&
                    //     this.nationalityChangedMultiple === true
                    //   ) {
                    //     const clone = JSON.parse(JSON.stringify(formData));
                    //     const value =
                    //       clone?.related_party?.[0]?.related_party_detail?.[0]
                    //         ?.dedup_identification;

                    //     this.convertToArrayMultiple(
                    //       value,
                    //       "id_type_id",
                    //       "id_type_details",
                    //       ["dedup_identification", "id_type_id"],
                    //       index ?? [0, 0],
                    //       ["related_party", "related_party_detail"]
                    //     );

                    //     this.nationalityChangedMultiple = false;
                    //   }

                    //   const d = this.functionGroup?.getRequiredDocuments(
                    //     this.optionsData["multi_validation_mapping"],
                    //     {
                    //       nationality:
                    //         formData?.related_party?.[index?.[0]]
                    //           ?.related_party_detail?.[index?.[1]]?.nationality,
                    //       account_type: formData?.account_info,
                    //     }
                    //   );

                    //   return d;
                    // },

                    onChange: async (value, index, id) => {
                      const { keys, indices } =
                        this.functionGroup?.parseIndexId(id);
                      await this.convertToArrayMultiple(
                        value,
                        "id_type_id",
                        "id_type_details",
                        ["dedup_identification", "id_type_id"],
                        index ?? [0, 0],
                        ["related_party", "related_party_detail"]
                      );
                    },
                  },
                },

                dedup_id_number: {
                  "ui:options": {
                    onChange: (value, index) => {
                      this.convertToArrayMultiple(
                        value,
                        "identification_number",
                        "id_type_details",
                        ["dedup_identification", "id_type_id"],
                        index ?? [0, 0],
                        ["related_party", "related_party_detail"]
                      );
                    },
                  },
                },
                father_name: {
                  "ui:options": {
                    onChange: (value, index) => {
                      this.convertToArrayMultiple(
                        value,
                        "family_member_full_name",
                        "family_information",
                        null,
                        index ?? [0, 0],
                        ["related_party", "related_party_detail"]
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
                    disableButton: (formData, index) =>
                      !(
                        formData?.related_party?.[
                          index?.[0]
                        ]?.related_party_detail?.[
                          index?.[1]
                        ]?.first_name?.trim() &&
                        formData?.related_party?.[
                          index?.[0]
                        ]?.related_party_detail?.[
                          index?.[1]
                        ]?.last_name?.trim() &&
                        formData?.related_party?.[
                          index?.[0]
                        ]?.related_party_detail?.[
                          index[1]
                        ]?.father_name?.trim() &&
                        formData?.related_party?.[index?.[0]]
                          ?.related_party_detail?.[index?.[1]]
                          ?.date_of_birth_ad &&
                        formData?.related_party?.[index?.[0]]
                          ?.related_party_detail?.[index?.[1]]
                          ?.date_of_birth_bs &&
                        formData?.related_party?.[index?.[0]]
                          ?.related_party_detail?.[index?.[1]]
                          ?.dedup_id_number &&
                        formData?.related_party?.[index?.[0]]
                          ?.related_party_detail?.[index?.[1]]
                          ?.dedup_identification
                      ),
                    onClick: (index) => {
                      this.getDedupCheck(index ?? 0, true);
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
                      this.form_status?.includes("Completed")) && ["match"],
                    actionHandlers: {
                      ...(!(
                        this.form_status?.includes("review") ||
                        this.form_status?.includes("approval") ||
                        this.form_status?.includes("Completed")
                      ) && {
                        match: (record, index) => {
                          if (record?.cif_number !== "-") {
                            this.setFormData((prev) => ({
                              ...prev,
                              related_party: prev?.related_party?.map(
                                (item, idx) =>
                                  idx === index?.[0]
                                    ? {
                                        ...item,
                                        related_party_detail:
                                          item?.related_party_detail?.map(
                                            (data, idx2) => {
                                              return idx2 === index[1]
                                                ? {
                                                    ...data,
                                                    has_cif: true,
                                                    cif_number:
                                                      record?.cif_number,
                                                  }
                                                : data;
                                            }
                                          ),
                                      }
                                    : item
                              ),
                            }));
                            this.fetchRelatedPartyEnquiry(
                              index ?? 0,
                              record?.cif_number
                            );
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
                    // actionHandlers: {
                    //   view: (record) => setIsModalVisible(true),
                    //   match: (record, index) =>
                    //     this.fetchRelatedPartyEnquiryMultipleLayer(
                    //       index ?? 0,
                    //       record?.cif_number
                    //     ),
                    // },
                  },
                },
                nationality: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData) => {
                      return this.filterOptions("nationalities");
                    },
                    onChange: (value, index) => {
                      this.dropdownResetMultipleLayer(
                        {
                          nationality: value,
                          dedup_identification:
                            value === "NP"
                              ? "CTZN"
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
                          id_type_details: !(value === "NP" || value === "IN")
                            ? [
                                {
                                  id_type_id: "PP",
                                },
                                {
                                  removable: false,
                                  id_type_id: "TRDOC",
                                },
                              ]
                            : [{}],
                          national_id_number: "",
                          national_id_issue_date_ad: undefined,
                          national_id_issue_date_bs: undefined,
                          national_id_issue_place: null,
                        },
                        ["related_party", "related_party_detail"],
                        index
                      );
                      value !== "IN" &&
                        (this.nationalityChangedMultiple = true);
                      return null;
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
                    "ui:ObjectFieldTemplate": ObjectFieldTemplate,
                    family_member_relation: {
                      "ui:widget": "CascadeDropdown",
                      "ui:placeholder": "Select Relationship",
                      "ui:disabled": true,
                      "ui:options": {
                        getOptions: (formData, rowIndex) => {
                          const familyInfo = formData?.family_information || [];

                          const currentValue =
                            familyInfo[
                              rowIndex
                            ]?.family_member_relation?.trim() || "";

                          const usedBefore = familyInfo
                            .slice(0, rowIndex)
                            .map((item) => item?.family_member_relation?.trim())
                            .filter(Boolean);

                          return (
                            this.filterOptions("relationships") || []
                          ).filter((opt) => {
                            const val = opt?.value?.trim();
                            if (!val) return false;
                            if (val === currentValue) return true;
                            return !usedBefore.includes(val);
                          });
                        },
                      },
                    },
                    family_member_full_name: {
                      "ui:placeholder": "Enter Full Name",
                      "ui:options": {
                        setDisabled: (formData, index) => {
                          return this.form_status.includes("init") ||
                            this.form_status.includes("update")
                            ? (formData?.related_party?.[index?.[0]]
                                ?.related_party_detail?.[index?.[1]]
                                ?.family_information?.[index[2]]
                                ?.family_member_relation === "FATHE" &&
                                formData?.related_party?.[index?.[0]]
                                  ?.related_party_detail?.[index?.[1]]
                                  ?.father_name) ||
                                formData?.related_party?.[index?.[0]]
                                  ?.related_party_detail?.[index?.[1]]
                                  ?.family_information?.[index[2]]
                                  ?.is_family_name_not_available
                            : true;

                          // return /* !formData?.related_party?.[index?.[0]]
                          //   ?.related_party_detail?.[index?.[1]]?.cif_data
                          //   ?  */
                          //   this.form_status.includes("init") ||
                          //     this.form_status.includes("update")
                          //     ? (formData?.related_party?.[index?.[0]]
                          //         ?.related_party_detail?.[index?.[1]]
                          //         ?.family_information?.[index[2]]
                          //         ?.family_member_relation ===
                          //         "FATHE" &&
                          //         formData?.related_party?.[index?.[0]]
                          //           ?.related_party_detail?.[index?.[1]]
                          //           ?.father_name) ||
                          //       formData?.related_party?.[index?.[0]]
                          //         ?.related_party_detail?.[index?.[1]]
                          //         ?.family_information?.[index[2]]
                          //         ?.is_family_name_not_available
                          //     : true;
                          //   // : true;
                        },
                      },
                    },

                    is_family_name_not_available: {
                      "ui:widget": "CustomCheckBoxWidget",
                      "ui:options": {
                        setDisabled: (formData, index) => {
                          return this.form_status.includes("init") ||
                            this.form_status.includes("update")
                            ? formData?.related_party?.[index?.[0]]
                                ?.related_party_detail?.[index?.[1]]
                                ?.family_information?.[index?.[2]]
                                ?.family_member_relation === "FATHE" &&
                              formData?.related_party?.[index?.[0]]
                                ?.related_party_detail?.[index?.[1]]
                                ?.father_name
                              ? true
                              : false
                            : true;
                        },
                        onChange: (value, index) => {
                          this.familyNameChange(
                            "family_member_full_name",
                            value,
                            "related_party.related_party_detail.family_information",
                            index ?? 0
                          );
                        },
                      },
                    },
                  },
                },

                salutation: {
                  "ui:widget": "CustomRadioWidget",
                  // "ui:label": false,
                  // "ui:options": {
                  //   getOptions: (formData) => {
                  //     return this.filterOptions(
                  //       "salutations",
                  //       formData?.account_info
                  //     );
                  //   },
                  //   onChange: (value, index) => {
                  //     this.dropdownResetMultipleLayer(
                  //       {
                  //         salutation: value,
                  //         gender: null,
                  //       },
                  //       ["related_party", "related_party_detail"],
                  //       index ?? [0, 0]
                  //     );
                  //   },
                  // },
                },
                gender: {
                  // "ui:widget": "CascadeDropdown",
                  // "ui:options": {
                  //   getOptions: (formData, index) => {
                  //     return this.filterOptions(
                  //       "genders",
                  //       formData?.related_party &&
                  //         formData?.related_party?.[index?.[0]]
                  //           ?.related_party_detail &&
                  //         formData?.related_party?.[index?.[0]]
                  //           ?.related_party_detail[index?.[1]]?.salutation
                  //     );
                  //   },
                  // },
                },
                permanent_province: {
                  "ui:widget": "CascadeDropdown",

                  "ui:options": {
                    getOptions: (formData, index) => {
                      return this.filterOptions("provinces");
                    },
                    onChange: (value, index) =>
                      this.dropdownResetMultipleLayer(
                        {
                          permanent_province: value,
                          permanent_district: null,
                          permanent_municipality: null,
                          permanent_ward_number: "",
                          permanent_street_name: "",
                          permanent_town: "",
                          permanent_house_number: "",
                        },
                        ["related_party", "related_party_detail"],
                        index ?? [0, 0]
                      ),
                  },
                },
                permanent_district: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      return this.filterOptions(
                        "districts",
                        formData?.related_party &&
                          formData?.related_party?.[index?.[0]]
                            ?.related_party_detail &&
                          formData.related_party?.[index?.[0]]
                            ?.related_party_detail[index?.[1]]
                            ?.permanent_province
                      );
                    },
                    onChange: (value, index) =>
                      this.dropdownReset(
                        {
                          permanent_district: value,
                          permanent_municipality: null,
                          permanent_ward_number: "",
                          permanent_street_name: "",
                          permanent_town: "",
                          permanent_house_number: "",
                        },
                        ["related_party", "related_party_detail"],
                        index
                      ),
                  },
                },

                permanent_municipality: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      return this.filterOptions(
                        "local_bodies",

                        formData.related_party?.[index?.[0]]
                          ?.related_party_detail[index?.[1]]?.permanent_district
                      );
                    },
                    onChange: (value, index) =>
                      this.dropdownReset(
                        {
                          permanent_municipality: value,
                          permanent_ward_number: "",
                          permanent_street_name: "",
                          permanent_town: "",
                          permanent_house_number: "",
                        },
                        ["related_party", "related_party_detail"],
                        index
                      ),
                  },
                },

                date_of_birth_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:placeholder": "Select Date of Birth (A.D)",
                  "ui:options": {
                    name: "date_of_birth_ad",
                    enforceAgeRestriction: true,
                    validAge: 18,
                    onDateChange: (selectedDate, index) => {
                      this.convertDateSinglee(
                        selectedDate,
                        setFormData,
                        true,
                        "date_of_birth_ad",
                        "related_party.related_party_detail",
                        index
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
                    onDateChange: (selectedDate, index) => {
                      this.convertDateSinglee(
                        selectedDate,
                        setFormData,
                        false,
                        "date_of_birth_bs",
                        "related_party.related_party_detail",
                        index
                      );
                    },
                  },
                },

                id_type_details: {
                  "ui:options": {
                    addable: !(
                      this.form_status?.includes("review") ||
                      this.form_status?.includes("approval") ||
                      this.form_status?.includes("Completed")
                    ),
                    orderable: false,
                    removable: !(
                      this.form_status?.includes("review") ||
                      this.form_status?.includes("approval") ||
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
                      "visa_type",
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
                    id_type_id: {
                      // "ui:widget": "CascadeDropdown",
                      // "ui:options": {
                      //   getOptions: (formData, index) => {
                      //     const newSelectedData = formData?.related_party?.[
                      //       index?.[0]
                      //     ]?.related_party_detail?.[
                      //       index?.[1]
                      //     ]?.id_type_details?.map((item, idx) =>
                      //       idx !== index ? item?.id_type_id : null
                      //     );
                      //     // const filterOption =
                      //     //   this.functionGroup?.getRequiredDocuments(
                      //     //     this.optionsData["multi_validation_mapping"],
                      //     //     {
                      //     //       nationality: formData?.nationality,
                      //     //       account_type:
                      //     //         this.formData?.account_info ??
                      //     //         formData?.account_info,
                      //     //     }
                      //     //   );
                      //     const filterOption =
                      //       this.functionGroup?.getRequiredDocuments(
                      //         this.optionsData["multi_validation_mapping"],
                      //         {
                      //           nationality:
                      //             formData?.related_party?.[index?.[0]]
                      //               ?.related_party_detail?.[index?.[1]]
                      //               ?.nationality,
                      //           account_type: formData?.account_info,
                      //         }
                      //       );
                      //     const currentSelectedValue =
                      //       formData?.related_party?.[index?.[0]]
                      //         ?.related_party_detail?.[index?.[1]]
                      //         ?.id_type_details?.[index?.[2]]?.id_type_id;
                      //     const dropdownOptions = filterOption?.filter(
                      //       (item) => {
                      //         if (
                      //           !item ||
                      //           !item.value ||
                      //           item.value.trim() === ""
                      //         )
                      //           return false;
                      //         return (
                      //           item.value === currentSelectedValue ||
                      //           !newSelectedData?.includes(item.value)
                      //         );
                      //       }
                      //     );
                      //     return dropdownOptions || [];
                      //   },
                      // },
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
                      "ui:help": "Date Format: YYYY-MM-DD",
                      "ui:placeholder": "Select Issued Date (A.D)",
                      "ui:options": {
                        name: "id_issued_date_ad",

                        enforceAgeRestriction: false,
                        validAge: 0,
                        disableFutureDates: true,
                        minimumDate: (formData, index) => {
                          const minDateValue = formData?.related_party?.[
                            index?.[0]
                          ]?.related_party_detail[
                            index[1]
                          ]?.id_type_details?.map((item) =>
                            this.moment(
                              formData?.related_party?.[index?.[0]]
                                ?.related_party_detail[index?.[1]]
                                ?.date_of_birth_ad
                            )
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
                            index,
                            "id_issued_date",
                            "related_party.related_party_detail.id_type_details"
                          );
                        },
                      },
                    },

                    id_issued_date_bs: {
                      "ui:widget": widgets.NepaliDatePickerR,
                      "ui:help": "Date Format: YYYY-MM-DD",
                      "ui:options": {
                        enforceAgeRestriction: true,
                        name: "id_issued_date_bs",
                        disableFutureDates: true,
                        minimumDate: (formData, index) => {
                          const minDateValue = formData?.related_party?.[
                            index?.[0]
                          ]?.related_party_detail?.[
                            index?.[1]
                          ]?.id_type_details?.map((item) =>
                            this.NepaliDate.parseEnglishDate(
                              this.moment(
                                formData?.related_party?.[index?.[0]]
                                  ?.related_party_detail?.[index?.[1]]
                                  ?.date_of_birth_ad
                              )
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
                            index,
                            "id_issued_date",
                            "related_party.related_party_detail.id_type_details"
                          );
                        },
                      },
                    },
                    id_expiry_date_ad: {
                      "ui:widget": widgets.CustomDatePicker,
                      "ui:help": "Date Format: YYYY-MM-DD",
                      "ui:placeholder": "Select Expiry Date (A.D)",
                      "ui:options": {
                        minDate: 0,
                        name: "id_expiry_date_ad",
                        enforceAgeRestriction: true,
                        enableFutureDates: true,
                        onDateChange: (selectedDate, index) => {
                          this.convertDate(
                            selectedDate,
                            setFormData,
                            true,
                            index,
                            "id_expiry_date",
                            "related_party.related_party_detail.id_type_details"
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
                        enableFutureDates: true,
                        onDateChange: (selectedDate, index) => {
                          this.convertDate(
                            selectedDate,
                            setFormData,
                            false,
                            index,
                            "id_expiry_date",
                            "related_party.related_party_detail.id_type_details"
                          );
                        },
                      },
                    },

                    issued_district: {
                      "ui:widget": "CascadeDropdown",
                      "ui:options": {
                        getOptions: (formData, index) => {
                          const identification =
                            formData?.related_party[index?.[0]]
                              ?.related_party_detail[index[1]]
                              ?.id_type_details?.[index[2]]?.id_type_id;
                          return this.filterOptions(
                            identification === "PP" ||
                              identification === "EMBSY"
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
                            formData?.related_party[index?.[0]]
                              ?.related_party_detail[index[1]]
                              ?.id_type_details?.[index[2]]?.id_type_id;
                          return this.filterOptions(
                            identification === "PP" ||
                              identification === "EMBSY"
                              ? "country_and_district"
                              : "countries"
                          );
                        },
                      },
                    },
                    visa_issued_date_ad: {
                      "ui:widget": widgets.CustomDatePicker,
                      "ui:help": "Date Format: YYYY-MM-DD",
                      "ui:placeholder": "Select Visa Issued Date (A.D)",
                      "ui:options": {
                        enforceAgeRestriction: false,
                        disableFutureDates: true,
                        validAge: 0,
                        minimumDate: (formData, index) => {
                          const minDateValue = formData?.related_party[
                            index?.[0]
                          ]?.related_party_detail[
                            index[1]
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
                      "ui:help": "Date Format: YYYY-MM-DD",
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
                last_name_not_available: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:label": false,
                  "ui:options": {
                    onChange: (value, index) => {
                      ChangeFiledToDot(
                        "last_name",
                        value,
                        "related_party.related_party_detail",
                        index
                      );
                    },
                  },
                },
                email_not_available: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:label": false,
                  "ui:options": {
                    onChange: (value, index) => {
                      ChangeFiledToDot(
                        "email",
                        value,
                        "related_party.related_party_detail",
                        index
                      );
                    },
                  },
                },

                cif_enquiry: {
                  "ui:widget": "ButtonField",
                  "ui:label": false,
                  "ui:classNames": "d-flex h-100 mt-5 align-items-center",
                  "ui:options": {
                    disableButton: (formData, index) => {
                      return !formData?.related_party?.[
                        index?.[0]
                      ]?.related_party_detail?.[index?.[1]]?.cif_number?.trim();
                    },
                    onClick: (index) => {
                      setTimeout(
                        () =>
                          setFormData((prev) => {
                            return {
                              ...prev,
                              related_party: prev?.related_party?.map(
                                (item, idx) =>
                                  idx === index?.[0]
                                    ? {
                                        ...item,
                                        related_party_detail:
                                          item?.related_party_detail?.map(
                                            (item2, idx2) =>
                                              idx2 === index?.[1]
                                                ? {
                                                    account_info:
                                                      item2?.account_info,
                                                    designation:
                                                      item?.designation,

                                                    has_cif: item2?.has_cif,
                                                    cif_number:
                                                      item2?.cif_number,
                                                  }
                                                : item2
                                          ),
                                      }
                                    : item
                              ),
                            };
                          }),
                        100
                      ),
                        this.fetchRelatedPartyEnquiryMultipleLayer(
                          index ? index : 0
                        );
                    },
                  },
                },

                personal_screening_data: {
                  "ui:widget": "ScreeningReportCard",
                  "ui:label": false,
                  showFooter: true,
                  showCheckbox: true,
                  showActionText: true,
                  fixedActionsColumn: true,
                  "ui:options": {
                    onCheckboxChange: (
                      tableData,
                      category,
                      checked,
                      index,
                      id
                    ) => {
                      if (index) {
                        this.setFormData((prevData) => ({
                          ...prevData,
                          related_party: prevData?.related_party?.map(
                            (item, i) =>
                              i === index?.[0]
                                ? {
                                    ...item,
                                    related_party_detail:
                                      item?.related_party_detail?.map(
                                        (detail, idx) =>
                                          idx === index[1]
                                            ? {
                                                ...detail,
                                                [category === "pep_nba"
                                                  ? "pep"
                                                  : category === "sanction_moha"
                                                  ? "sanction"
                                                  : category]: checked
                                                  ? "Yes"
                                                  : "No",
                                                personal_screening_data:
                                                  tableData,
                                              }
                                            : detail
                                      ),
                                  }
                                : item
                          ),
                        }));
                      }
                    },

                    actionHandlers: {
                      view: (record) => setIsModalVisible(true),
                    },
                  },
                },
                screening_filter: {
                  "ui:widget":
                    /* this.form_status?.includes("init")
                    ? "ButtonField"
                    : */ "hidden",
                  "ui:label": false,
                  "ui:classNames": "my-2",
                  "ui:options": {
                    disableButton: (formData) => {
                      let requiredFields = jsonSchema.required || [];

                      const allFilled = requiredFields.every((field) => {
                        const value = formData?.[field];

                        return (
                          value !== undefined && value !== null && value !== ""
                        );
                      });

                      const isDedupCheck = !!formData?.dedup_module_data;

                      const isTrue = !(allFilled && isDedupCheck);

                      return this.form_status?.includes("init") && isTrue;
                    },
                    onClick: (index) => {
                      setFormData((prevData) => {
                        const currentValue = prevData?.screening_filter;

                        function toggleFilter(value) {
                          if (value === undefined) return "true";
                          if (value === "true") return "false";
                          return "true";
                        }

                        return {
                          ...prevData,
                          related_party: prevData?.related_party?.map(
                            (item, i) =>
                              i === index?.[0]
                                ? {
                                    ...item,
                                    related_party_detail:
                                      item?.related_party_detail?.map(
                                        (detail, idx) =>
                                          idx === index[1]
                                            ? {
                                                ...detail,
                                                screening_filter:
                                                  toggleFilter(currentValue),
                                              }
                                            : detail
                                      ),
                                  }
                                : item
                          ),
                        };
                      });
                    },
                  },
                },
                personal_info_screening: {
                  "ui:widget": "hidden",
                  "ui:label": false,
                  "ui:classNames": "my-2",
                  "ui:options": {
                    block: true,
                    disableButton: (formData, index) => {
                      return !formData?.related_party?.[
                        index?.[0]
                      ]?.related_party_detail?.[index?.[1]]?.first_name?.trim();
                    },
                    onClick: (index) => {
                      this.fetchRelatedPartyInfoScreeningMultipleLayer(
                        index ?? 0
                      );
                    },
                  },
                },

                occupation_type: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => this.filterOptions("occupations"),
                    onChange: (value, index) =>
                      this.dropdownReset(
                        {
                          occupation_type: value,
                          source_of_income: null,
                        },
                        ["related_party", "related_party_detail"],
                        index
                      ),
                  },
                },

                occupation_detail: {
                  "ui:classNames": "my-1",
                  "ui:options": {
                    addable: !(
                      this.form_status?.includes("review") ||
                      this.form_status?.includes("approval") ||
                      this.form_status?.includes("Completed")
                    ),
                    orderable: false,
                    removable: !(
                      this.form_status?.includes("review") ||
                      this.form_status?.includes("approval") ||
                      this.form_status?.includes("Completed")
                    ),
                  },
                  items: {
                    designation: {
                      "ui:widget": "CascadeDropdown",
                      "ui:options": {
                        getOptions: () =>
                          this.filterOptions("corporate_relation"),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
