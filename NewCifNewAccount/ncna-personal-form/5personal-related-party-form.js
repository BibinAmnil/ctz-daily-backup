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
      //Check if the User has Viewed the Application
      this.functionGroup?.checkAndAssignScreeningErrors(formData, errors);

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
      // const nonClearableField = [
      //   "designation",
      //   "has_cif",
      //   "cif_number",
      //   "first_name",
      //   "middle_name",
      //   "last_name",
      //   "last_name_not_available",
      //   "father_name",
      //   "dedup_id_number",
      //   "dedup_identification",
      //   "date_of_birth_ad",
      //   "date_of_birth_bs",
      //   "account_info",
      //   "account_type_id",
      //   "account_scheme_id",
      //   "currency",
      //   "nationality",
      //   "customer_type_id",
      //   "customer_status",
      // ];
      // !(
      //   this.formData?.related_party?.[index]?.has_cif ||
      //   this.formData?.related_party?.[index?.[0]]?.related_party_detail[
      //     index?.[1]
      //   ]?.has_cif
      // ) && this.formDataCleaner(nonClearableField, isMultiLayer, index);

      isMultiLayer
        ? this.addLoaderMultiple(
            ["related_party", "related_party_detail", "dedup_check"],
            true
          )
        : this.addLoader(["related_party", "dedup_check"], true);
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/screening-check`,
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
            id_number: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.dedup_id_number
              : this.formData?.related_party?.[index].dedup_id_number,
            dob_ad: isMultiLayer
              ? this.formData?.related_party?.[index?.[0]]
                  ?.related_party_detail[index[1]]?.date_of_birth_ad
              : this.formData?.related_party?.[index].date_of_birth_ad,
          }
        );

        const responseData = response?.data?.data;
        const cleanedResponseData = Object.fromEntries(
          Object.entries(responseData).filter(
            ([key, value]) => !(Array.isArray(value) && value.length === 0)
          )
        );

        delete cleanedResponseData.screening_id;

        if (isMultiLayer) {
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
                              personal_screening_data:
                                cleanedResponseData || [],
                              screening_ref_code: String(
                                responseData?.screening_id
                              ),
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
                ? {
                    ...item,
                    personal_screening_data: cleanedResponseData || [],
                    screening_ref_code: String(responseData?.screening_id),
                  }
                : item
            ),
          }));
        }
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

    async updateFormAndSchema(formData, schemaConditions) {
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

              "first_name",
              "middle_name",
              "last_name",
              "last_name_not_available",
              "father_name",
              "grandfather_name",
              "date_of_birth_ad",
              "date_of_birth_bs",
              "dedup_identification",
              "dedup_id_number",
              "existing_permanent_address",
              "family_account_holder",
              "relation_with_account_holder",

              "extra_gap",
              "dedup_check",
              "dedup_module_data",
              "personal_screening_data",
              "screening_ref_code",

              "hpp",
              "hpp_category",
              "hpp_sub_category",
              "pep",
              "pep_category",
              "pep_declaration",
              "family_pep_declaration",
              "adverse_media",
              "adverse_category",

              "loan_status",
              "is_blacklisted",
              "customer_introduce_by",
              "introducer_account_number",
              "customer_name",
              "employee_id",
              "met_in_person",

              "risk_level",
              "is_high_risk_account",
              "calculate_risk",

              "cif_data",
            ],
            connectedPairs: [
              ["last_name", "last_name_not_available"],
              ["email", "email_not_available"],
            ],
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
            cif_data: {
              "ui:widget": "hidden",
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

            dedup_identification: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  const options = this.filterOptions("document_types");
                  return options;
                },
              },
            },

            dedup_id_number: {},
            father_name: {},
            dedup_check: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
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
                "ui:ObjectFieldTemplate": ObjectFieldTemplate,
                "ui:order": [
                  "designation",
                  "has_cif",
                  "cif_number",
                  "cif_enquiry",

                  "first_name",
                  "middle_name",
                  "last_name",
                  "last_name_not_available",
                  "father_name",
                  "grandfather_name",
                  "date_of_birth_ad",
                  "date_of_birth_bs",
                  "dedup_identification",
                  "dedup_id_number",
                  "existing_permanent_address",
                  "family_account_holder",
                  "relation_with_account_holder",

                  "extra_gap",
                  "dedup_check",
                  "dedup_module_data",
                  "personal_screening_data",
                  "screening_ref_code",

                  "hpp",
                  "hpp_category",
                  "hpp_sub_category",
                  "pep",
                  "pep_category",
                  "pep_declaration",
                  "family_pep_declaration",
                  "adverse_media",
                  "adverse_category",

                  "loan_status",
                  "is_blacklisted",
                  "customer_introduce_by",
                  "introducer_account_number",
                  "customer_name",
                  "employee_id",
                  "met_in_person",

                  "risk_level",
                  "is_high_risk_account",
                  "calculate_risk",

                  "cif_data",
                ],
                connectedPairs: [
                  ["last_name", "last_name_not_available"],
                  ["email", "email_not_available"],
                ],
                cif_data: {
                  "ui:widget": "hidden",
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

                dedup_identification: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      const options = this.filterOptions("document_types");
                      return options;
                    },
                  },
                },

                dedup_id_number: {},
                father_name: {},
                dedup_check: {
                  "ui:widget": this.form_status?.includes("init")
                    ? "ButtonField"
                    : "hidden",
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

                screening_ref_code: {
                  "ui:widget": "hidden",
                  "ui:label": false,
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
