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
      this.setJsonSchema = options.setJsonSchema;
      this.setUiSchema = options.setUiSchema;
      this.adToBs = options.adToBs;
      this.bsToAd = options.bsToAd;
      this.masterDataUrl = masterDataUrl;
      this.isMasterDataLoaded = false;
      this.setNextStep = options.setNextStep;
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
        related_party_date_of_birth_ad: [
          "related_party_date_of_birth_ad",
          "related_party_date_of_birth_bs",
        ],
        related_party_date_of_birth_bs: [
          "related_party_date_of_birth_ad",
          "related_party_date_of_birth_bs",
        ],
        related_party_id_issued_date_ad: [
          "related_party_id_issued_date_ad",
          "related_party_id_issued_date_bs",
        ],
        related_party_id_issued_date_bs: [
          "related_party_id_issued_date_ad",
          "related_party_id_issued_date_bs",
        ],
        related_party_id_expiry_date_ad: [
          "related_party_id_expiry_date_ad",
          "related_party_id_expiry_date_bs",
        ],
        related_party_id_expiry_date_bs: [
          "related_party_id_expiry_date_ad",
          "related_party_id_expiry_date_bs",
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
                      [fieldName]: value ? "." : "",
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
      }, 700);
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
                    [adField]: selectedDate,
                    [bsField]: convertedDate,
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
    }

    filterOptionsByCascadeId(options, cascadeId) {
      const filteredOptions = options.filter(
        (option) => option.cascade_id == cascadeId
      );

      return filteredOptions;
    }

    async lastNameChanges(fieldName, value, arrayPath, index) {
      setTimeout(() => {
        this.setFormData((prevFormData) => {
          const newData = { ...prevFormData };
          const shouldClear = value === "Yes";

          let currentLevel = newData;
          const pathParts = arrayPath.split(".");
          if (typeof index === "object") {
            pathParts.forEach((part, level) => {
              const idx = index[level];

              if (!currentLevel[part]) return;

              if (Array.isArray(currentLevel[part])) {
                currentLevel[part] = currentLevel[part].map((item, i) => {
                  if (i === idx) {
                    if (level === pathParts.length - 1) {
                      return {
                        ...item,
                        [fieldName]: value === "Yes" ? "." : "",
                      };
                    }
                    return { ...item };
                  }
                  return item;
                });
              }

              currentLevel = currentLevel[part][idx];
            });
          } else {
            if (arrayPath && index !== null) {
              const array = newData[arrayPath];
              if (Array.isArray(array) && array[index]) {
                newData[arrayPath] = array.map((item, i) =>
                  i === index
                    ? {
                        ...item,
                        [fieldName]: shouldClear ? "." : "",
                      }
                    : item
                );
              }
            }
          }

          return newData;
        });
      }, 700);
    }

    async updateSchemaWithEnums(
      fieldKey,
      optionsData,
      setJsonSchema,
      cascadeId = null
    ) {
      const fieldMapping = {
        related_party_nationality: "nationalities",
        related_party_permanent_country: "countries",
        related_party_permanent_province: "provinces",
        related_party_permanent_district: "districts",
        related_party_permanent_municipality: "local_bodies",
        related_party_current_country: "countries",
        related_party_current_province: "provinces",
        related_party_current_district: "districts",
        related_party_current_municipality: "local_bodies",
        related_party_family_member_relation: "relationships",
        related_party_id_type_id: "document_types",
        related_party_issue_country: "countries",
        related_party_issued_district: "districts",
        related_party_issuing_authority: "issuing_authorities",
        related_party_pep_relationsip: "relationships",
        related_party_relation_with_account_holder: "relationships",
        related_party_occupation_type: "occupation_types",
        related_party_source_of_income: "income_sources",
        related_party_business_type: "business_type",
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

      // fieldOptions.map((option) => String(option?.fg_code || option?.cbs_code || option?.id));
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

          if (schema.allOf) {
            for (const depKey in schema.allOf) {
              const dependency = schema.allOf[depKey];

              if (dependency.oneOf || dependency.anyOf) {
                (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
                  if (depSchema.properties) updateProperties(depSchema);
                });
              } else if (dependency.if) {
                if (dependency.then) updateProperties(dependency.then);
                if (dependency.else) updateProperties(dependency.else);
              } else if (dependency.oneOf || dependency.anyOf) {
                (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
                  if (depSchema.properties) updateProperties(depSchema);
                });
              }
            }
          }
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
              } else if (dependency.oneOf || dependency.anyOf) {
                (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
                  if (depSchema.properties) updateProperties(depSchema);
                });
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
      // this.setNextStep("ncna-corporate-cdd");

      const fieldsToUpdate = [
        "related_party_nationality",
        "related_party_permanent_country",
        "related_party_permanent_province",
        "related_party_permanent_district",
        "related_party_permanent_municipality",
        "related_party_current_country",
        "related_party_current_province",
        "related_party_current_district",
        "related_party_current_municipality",
        "related_party_family_member_relation",
        "related_party_id_type_id",
        "related_party_issue_country",
        "related_party_issued_district",
        "related_party_issuing_authority",
        "related_party_pep_relationsip",
        "related_party_relation_with_account_holder",
        "related_party_occupation_type",
        "related_party_source_of_income",
        "related_party_business_type",
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

    async fetchRelatedInfoScreening(index) {
      const relatedEntry = this.formData.related_party[index];
      // console.log(value.replace("root_"), value.split("_"), "sdk version");
    }

    async fetchRelatedInfoCIFDetail(index) {
      try {
        if (!this.formData.related_party[index]?.related_party_cif_number) {
          this.toast.error("Please enter a CIF Number");
          return;
        }
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number:
              this.formData.related_party[index]?.related_party_cif_number,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data;

        // this.setFormData(resp);
        this.setFormData((prevFormData) => {
          const updatedJointDetails = [...prevFormData.related_party];
          updatedJointDetails[index ? index : 0] = {
            ...updatedJointDetails[index ? index : 0], // Clone object
            related_party_first_name: "Prefilled Name", // Update value
          };

          return {
            ...prevFormData, // Keep the rest of formData unchanged
            related_party: updatedJointDetails, // Update joint_details
          };
        });

        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
      }
    }

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
      if (this.form_status?.includes("review")) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: false,
        }));
      } else if (this.form_status?.includes("Completed")) {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          submissionHidden: true,
          hasStep: false,
        }));
      } else {
        this.setJsonSchema((prevJsonSchema) => ({
          ...prevJsonSchema,
          hasStep: true,
        }));
      }
    }

    createUISchema(options) {
      const {
        setJsonSchema,
        formData,
        setFormData,
        ObjectFieldTemplate,
        ArrayFieldTemplate,
        widgets,
      } = options;

      const provinceOnChange = async (value, districtName) => {
        await this.updateSchemaWithEnums(
          districtName,
          this.optionsData,
          setJsonSchema,
          value
        );
      };

      const handleLastNameNotAvailableChange = (
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
              [fieldName]: value === "Yes" ? "." : "",
            };

            return {
              ...prevFormData,
              [arrayPath]: updatedRelatedPartyDetails,
            };
          });
        }, 700);
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
              [fieldName]: value === "Yes" ? "." : "",
            };

            return {
              ...prevFormData,
              [arrayPath]: updatedRelatedPartyDetails,
            };
          });
        }, 700);
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
                        [fieldName]: value == "Yes" ? "." : "",
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
        }, 700);
      };
      this.initializeSchema(setJsonSchema, formData);
      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": [
          "has_related_party",
          "related_party",
          "approval_status",
          "approval_remarks",
        ],

        related_party: {
          items: {
            "ui:order": [
              "related_party_organization_type",
              "related_party_designation",
              "related_party_shareholder_details",
              "related_party_full_name",
              "related_party_type",
              "related_party_shares",
              "related_party_has_cif",
              "related_party_cif_number",
              "related_party_cif_enquiry",
              "related_party_salutation",
              "related_party_first_name",
              "related_party_middle_name",
              "related_party_last_name",
              "related_party_last_name_not_available",
              "related_party_gender",
              "related_party_date_of_birth_ad",
              "related_party_date_of_birth_bs",
              "related_party_nationality",
              "related_party_landline_number",
              "related_party_mobile_number",
              "related_party_email",
              "related_party_email_not_available",
              "related_party_permanent_country",
              "related_party_permanent_province",
              "related_party_permanent_district",
              "related_party_permanent_municipality",
              "related_party_permanent_ward_number",
              "related_party_permanent_street_name",
              "related_party_permanent_town",
              "related_party_permanent_house_number",
              "related_party_permanent_outside_town",
              "related_party_permanent_outside_street_name",
              "related_party_same_as_permanent",
              "related_party_current_country",
              "related_party_current_province",
              "related_party_current_district",
              "related_party_current_municipality",
              "related_party_current_ward_number",
              "related_party_current_street_name",
              "related_party_current_town",
              "related_party_current_house_number",
              "related_party_current_outside_town",
              "related_party_current_outside_street_name",

              "related_party_family_information",
              "related_party_family_member_relation",
              "related_party_family_member_full_name",
              "related_party_id_type_id",
              "related_party_identification_number",
              "related_party_issue_country",
              "related_party_id_issued_date_ad",
              "related_party_id_issued_date_bs",
              "related_party_id_expiry_date_ad",
              "related_party_id_expiry_date_bs",
              "related_party_issuing_authority",
              "related_party_issued_district",
              "related_party_visa_issued_date_ad",
              "related_party_visa_expiry_date_ad",
              "related_party_visa_type",
              "related_party_pep_person",
              "related_party_pep_name",
              "related_party_pep_relationsip",
              "is_related_party_family_account_holder",
              "related_party_relation_with_account_holder",
              "related_party_crime_in_past",
              "related_party_crime_descripition",
              "related_party_occupation_type",
              "related_party_business_type",
              "related_party_source_of_income",
              "related_party_work_permit",
              "related_party_screening",
              "is_block_list",
              "is_existing_cif",
              "scheme_check",
              "is_cib_list",
              "is_sanction",
            ],
            related_party_last_name_not_available: {
              "ui:options": {
                onChange: (value, index) => {
                  this.lastNameChanges(
                    "related_party_last_name",
                    value,
                    "related_party",
                    index ?? 0
                  );
                },
              },
            },
            related_party_email_not_available: {
              "ui:options": {
                onChange: (value, index) => {
                  handleEmailNotAvailableChange(
                    "related_party_email",
                    value,
                    "related_party",
                    index ?? 0
                  );
                },
                preserveValue: true,
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

            related_party_salutation: {
              "ui:widget": "CustomRadioWidget",
            },

            related_party_cif_enquiry: {
              "ui:widget": "ButtonField",
              "ui:label": false,
              "ui:classNames": "d-flex h-100 mt-4 align-items-center",
            },

            related_cif_button: {
              "ui:widget": "ButtonField",
              "ui:options": {
                onClick: (index) => {
                  this.fetchRelatedInfoCIFDetail(index ? index : 0);
                },
              },
            },

            related_party_screening: {
              "ui:widget": "ButtonField",
              "ui:label": false,
              "ui:options": {
                onClick: (index) => {
                  this.fetchRelatedInfoScreening(index ? index : 0);
                },
              },
            },
            related_party_date_of_birth_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Date of Birth (A.D)",
              "ui:options": {
                name: "related_party_date_of_birth_ad",
                enforceAgeRestriction: true,
                validAge: 18,
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "related_party_date_of_birth_ad",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },
            related_party_date_of_birth_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:options": {
                enforceAgeRestriction: true,
                name: "related_party_date_of_birth_bs",
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "related_party_date_of_birth_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },

            related_party_id_issued_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Date of Birth (A.D)",
              "ui:options": {
                name: "related_party_id_issued_date_ad",
                enforceAgeRestriction: true,
                validAge: 18,
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "related_party_id_issued_date_ad",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },
            related_party_id_issued_date_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:options": {
                enforceAgeRestriction: true,
                name: "related_party_id_issued_date_bs",
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "related_party_id_issued_date_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },

            related_party_id_expiry_date_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:options": {
                enforceAgeRestriction: true,
                name: "related_party_id_expiry_date_bs",
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "related_party_id_expiry_date_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },

            related_party_id_expiry_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Date of Birth (A.D)",
              "ui:options": {
                name: "related_party_id_expiry_date_ad",
                enforceAgeRestriction: true,
                validAge: 18,
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "related_party_id_expiry_date_ad",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },
            related_party_id_expiry_date_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:options": {
                enforceAgeRestriction: true,
                name: "related_party_id_expiry_date_bs",
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "related_party_id_expiry_date_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },
            related_party_issuing_authority: {
              "ui:placeholder": "Enter Issuing Authority",
            },
            related_party_issued_district: {
              "ui:placeholder": "Select Place of Issue",
            },
            related_party_visa_issued_date_ad: {
              "ui:placeholder": "Select Visa Issued Date (A.D)",
              "ui:options": {
                //   minDate: this.moment().subtract(100, "years"),
                //   maxDate: this.moment().subtract(18, "years"),
                enforceAgeRestriction: false,
                validAge: 0,
              },
            },
            related_party_visa_expiry_date_ad: {
              "ui:placeholder": "Select Visa Expiry Date (A.D)",
              "ui:options": {
                enforceAgeRestriction: false,
                minDate: 0,
              },
            },
            related_party_visa_type: {
              "ui:placeholder": "Select Visa Type",
            },
            related_party_permanent_province: {
              "ui:options": {
                onChange: (value) =>
                  provinceOnChange(value, "related_party_permanent_district"),
              },
            },
            related_party_family_information: {
              "ui:ArrayFieldTemplate": ArrayFieldTemplate,
              items: {
                "ui:ObjectFieldTemplate": ObjectFieldTemplate,
                related_party_family_member_relation: {
                  "ui:placeholder": "Select Relationship",
                },
                related_party_family_member_full_name: {
                  "ui:placeholder": "Enter Full Name",
                },
                related_party_is_family_name_not_available: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:options": {
                    onChange: (value, index) => {
                      this.familyNameChange(
                        "related_party_family_member_full_name",
                        value,
                        "related_party.related_party_family_information",
                        index
                      );
                    },
                  },
                },
                "ui:options": {
                  addable: true,
                  orderable: false,
                  removable: true,
                },
              },
            },

            related_party_shareholder_details: {
              items: {
                "ui:order": [
                  "related_party_organization_type",
                  "related_party_designation",
                  "related_party_shareholder_details",
                  "related_party_full_name",
                  "related_party_type",
                  "related_party_shares",
                  "organization_shareholder_details",
                  "related_party_has_cif",
                  "related_party_cif_number",
                  "related_party_cif_enquiry",
                  "related_party_salutation",
                  "related_party_first_name",
                  "related_party_middle_name",
                  "related_party_last_name",
                  "related_party_last_name_not_available",
                  "related_party_gender",
                  "related_party_date_of_birth_ad",
                  "related_party_date_of_birth_bs",
                  "related_party_nationality",
                  "related_party_landline_number",
                  "related_party_mobile_number",
                  "related_party_email",
                  "related_party_email_not_available",
                  "related_party_permanent_country",
                  "related_party_permanent_province",
                  "related_party_permanent_district",
                  "related_party_permanent_municipality",
                  "related_party_permanent_ward_number",
                  "related_party_permanent_street_name",
                  "related_party_permanent_town",
                  "related_party_permanent_house_number",
                  "related_party_permanent_outside_town",
                  "related_party_permanent_outside_street_name",
                  "related_party_same_as_permanent",
                  "related_party_current_country",
                  "related_party_current_province",
                  "related_party_current_district",
                  "related_party_current_municipality",
                  "related_party_current_ward_number",
                  "related_party_current_street_name",
                  "related_party_current_town",
                  "related_party_current_house_number",
                  "related_party_current_outside_town",
                  "related_party_current_outside_street_name",
                  "related_party_family_information",
                  "related_party_family_member_relation",
                  "related_party_family_member_full_name",
                  "related_party_id_type_id",
                  "related_party_identification_number",
                  "related_party_issue_country",
                  "related_party_id_issued_date_ad",
                  "related_party_id_issued_date_bs",
                  "related_party_id_expiry_date_ad",
                  "related_party_id_expiry_date_bs",
                  "related_party_issuing_authority",
                  "related_party_issued_district",
                  "related_party_visa_issued_date_ad",
                  "related_party_visa_expiry_date_ad",
                  "related_party_visa_type",
                  "related_party_pep_person",
                  "related_party_pep_name",
                  "related_party_pep_relationsip",
                  "is_related_party_family_account_holder",
                  "related_party_relation_with_account_holder",
                  "related_party_crime_in_past",
                  "related_party_crime_descripition",
                  "related_party_occupation_type",
                  "related_party_business_type",
                  "related_party_source_of_income",
                  "related_party_work_permit",
                  "related_party_screening",
                  "is_block_list",
                  "is_existing_cif",
                  "scheme_check",
                  "is_cib_list",
                  "is_sanction",
                ],

                related_party_last_name_not_available: {
                  "ui:options": {
                    onChange: (value, index) => {
                      this.lastNameChanges(
                        "related_party_last_name",
                        value,
                        "related_party.related_party_shareholder_details",
                        index
                      );
                    },
                  },
                },
                related_party_email_not_available: {
                  "ui:options": {
                    onChange: (value, index) => {
                      this.lastNameChanges(
                        "related_party_email",
                        value,
                        "related_party.related_party_shareholder_details",
                        index
                      );
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

                related_party_salutation: {
                  "ui:widget": "CustomRadioWidget",
                },

                related_party_cif_enquiry: {
                  "ui:widget": "ButtonField",
                  "ui:label": false,
                  "ui:classNames": "d-flex h-100 mt-4 align-items-center",
                },

                related_cif_button: {
                  "ui:widget": "ButtonField",
                  "ui:options": {
                    onClick: (index) => {
                      this.fetchRelatedInfoCIFDetail(index ? index : 0);
                    },
                  },
                },

                related_party_screening: {
                  "ui:widget": "ButtonField",
                  "ui:label": false,
                  "ui:options": {
                    onClick: (index) => {
                      this.fetchRelatedInfoScreening(index ? index : 0);
                    },
                  },
                },

                related_party_date_of_birth_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:options": {
                    name: "related_party_date_of_birth_ad",
                    enforceAgeRestriction: true,
                    validAge: 18,
                    onDateChange: (selectedDate, index, hello) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "related_party_date_of_birth",
                        "related_party.related_party_shareholder_details"
                      );
                    },
                  },
                },

                related_party_date_of_birth_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
                  "ui:options": {
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "related_party_date_of_birth",
                        "related_party.related_party_shareholder_details"
                      );
                    },
                  },
                },
                related_party_id_issued_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Date of Birth (A.D)",
                  "ui:options": {
                    name: "related_party_id_issued_date_ad",
                    enforceAgeRestriction: true,
                    validAge: 18,
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "related_party_id_issued_date",
                        "related_party.related_party_shareholder_details"
                      );
                    },
                  },
                },
                related_party_id_issued_date_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
                  "ui:options": {
                    enforceAgeRestriction: true,
                    name: "related_party_id_issued_date_bs",
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "related_party_id_issued_date",
                        "related_party.related_party_shareholder_details"
                      );
                    },
                  },
                },

                related_party_id_expiry_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Date of Birth (A.D)",
                  "ui:options": {
                    name: "related_party_id_expiry_date_ad",
                    enforceAgeRestriction: true,
                    validAge: 18,
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "related_party_id_expiry_date",
                        "related_party.related_party_shareholder_details"
                      );
                    },
                  },
                },
                related_party_id_expiry_date_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
                  "ui:options": {
                    enforceAgeRestriction: true,
                    name: "related_party_id_expiry_date_bs",
                    onDateChange: (selectedDate, index) => {
                      this.convertDateSingle(
                        selectedDate,
                        setFormData,
                        true,
                        "related_party_id_expiry_date_bs",
                        "related_party",
                        index ? index : 0
                      );
                    },
                  },
                },
                related_party_issuing_authority: {
                  "ui:placeholder": "Enter Issuing Authority",
                },
                related_party_issued_district: {
                  "ui:placeholder": "Select Place of Issue",
                },
                related_party_visa_issued_date_ad: {
                  "ui:placeholder": "Select Visa Issued Date (A.D)",
                  "ui:options": {
                    //   minDate: this.moment().subtract(100, "years"),
                    //   maxDate: this.moment().subtract(18, "years"),
                    enforceAgeRestriction: false,
                    validAge: 0,
                  },
                },
                related_party_visa_expiry_date_ad: {
                  "ui:placeholder": "Select Visa Expiry Date (A.D)",
                  "ui:options": {
                    enforceAgeRestriction: false,
                    minDate: 0,
                  },
                },
                related_party_visa_type: {
                  "ui:placeholder": "Select Visa Type",
                },

                related_party_permanent_province: {
                  "ui:options": {
                    onChange: (value) =>
                      provinceOnChange(
                        value,
                        "related_party_permanent_district"
                      ),
                  },
                },
                related_party_family_information: {
                  "ui:ArrayFieldTemplate": ArrayFieldTemplate,
                  items: {
                    "ui:ObjectFieldTemplate": ObjectFieldTemplate,
                    related_party_family_member_relation: {
                      "ui:placeholder": "Select Relationship",
                      "ui:disabled": true,
                    },
                    related_party_family_member_full_name: {
                      "ui:placeholder": "Enter Full Name",
                    },
                    related_party_is_family_name_not_available: {
                      "ui:widget": "CustomCheckBoxWidget",
                      "ui:options": {
                        onChange: (value, index) => {
                          this.familyNameChange(
                            "related_party_family_member_full_name",
                            value,
                            "related_party.related_party_shareholder_details.related_party_family_information",
                            index
                          );
                        },
                      },
                    },
                    "ui:options": {
                      addable: true,
                      orderable: false,
                      removable: true,
                    },
                  },
                },
              },
            },
          },
        },
        approval_status: {
          "ui:disabled": !this.form_status?.includes("review"),
          "ui:widget": this.form_status?.includes("review")
            ? "SelectWidget"
            : "hidden",
        },
        approval_remarks: {
          "ui:disabled": !this.form_status?.includes("review"),
          "ui:widget": this.form_status?.includes("review")
            ? "textarea"
            : "hidden",
          "ui:options": {
            rows: 5,
          },
        },
      };
    }
  }

  window.UISchemaFactory = UISchemaFactory;
})();
