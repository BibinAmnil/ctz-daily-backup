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
      //     "View all Screening Data To Continue"
      //   );
      //   this.toast.error("View all Screening Data To Continue");
      // }

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

    //GET DEDUP CHECK
    async getDedupCheck(index) {
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
        // Screening check
        const screeningResponse = await this.axios.post(
          `${this.mainRouteURL}/external-api/screening-check`,
          {
            first_name: this.formData.first_name,
            middle_name: this.formData.middle_name,
            last_name: this.formData.last_name,
            citizenship_no: this.formData.dedup_id_number,
            dob_ad: this.formData.date_of_birth_ad,
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
          this.setFormData((prevData) => ({
            ...prevData,
            joint_details: prevData?.joint_details?.map((item, idx) =>
              idx === index
                ? {
                    ...item,
                    personal_screening_data: cleanedResponseData || [],
                    screening_ref_code: String(responseData?.screening_id),
                  }
                : item
            ),
          }));
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
      fromAdToBs && this.setRenderFormKey((prev) => prev + 1);
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
        place_of_issue: "districts",
        hpp_category: "hpp_categories",
        hpp_sub_category: "hpp_sub_categories",
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
        "place_of_issue",
        "hpp_category",
        "hpp_sub_category",
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

      // Initialize schema dynamically based on API data
      this.initializeSchema(setJsonSchema, formData);

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
          "ui:widget": "CustomCheckBoxWidget",
          "ui:classNames": "d-flex align-items-center",
          "ui:label": false,
        },
        account_info: {
          "ui:widget": "hidden",
        },

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
              ["last_name", "last_name_not_available"],
              ["email", "email_not_available"],
            ],
            "ui:order": [
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
              "id_type_details",

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
              "calculate_risk",
              "cif_data",
            ],

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
            cif_data: {
              "ui:widget": "hidden",
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
            date_of_birth_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Date of Birth (A.D)",
              "ui:help": "Date Format: YYYY-MM-DD",
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
              "ui:help": "Date Format: YYYY-MM-DD",
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

            dedup_identification: {
              "ui:options": {
                onChange: (value, index) => {
                  this.dropdownReset(
                    {
                      dedup_identification: value,

                      dedup_id_number: "",
                    },
                    "joint_details",
                    index ?? 0
                  );
                },
              },
            },
            dedup_id_number: {
              "ui:options": {
                maxLength: 30,
              },
            },
            relation_with_account_holder: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) =>
                  this.filterOptions("relationships"),
              },
            },
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
            screening_ref_code: {
              "ui:widget": "hidden",
            },

            id_type_details: {
              "ui:options": {
                addable: false,
                orderable: false,
                removable: false,
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

                id_type_id: {},
                issuing_authority: {},
                identification_number: {},
                issue_country: {},
                issued_district: {},

                id_issued_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Issued Date (A.D)",
                  "ui:help": "Date Format: YYYY-MM-DD",
                  "ui:options": {
                    name: "id_issued_date_ad",
                    enforceAgeRestriction: true,
                    validAge: 0,
                    disableFutureDates: true,
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
                  },
                },
              },
            },

            hpp_sub_category: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  return this.filterOptions(
                    "hpp_sub_categories",
                    formData?.hpp_category
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
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
