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

    //Render Form
    async renderForm() {
      this.setRenderFormKey((prev) => prev + 1);
    }

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

    async fetchCorporateInfoCIFDetail(cif, formData) {
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
          account_info: formData?.account_info,
          has_cif: formData?.has_cif,
          cif_number: formData?.cif_number,
          cif_data: respData,
          form_meta_data: respData,
        };
        setTimeout(() => {
          this.setFormData((prev) => {
            const updatedData = { ...resp };
            return updatedData;
          });
        }, 1000);

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
          screening_ref_code: response?.data?.data?.reference_number,
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
        other_business_type: "other_business_type",
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
        // "business_type_id",
        // "business_type",
        // "type_of_transaction",
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
        "other_business_type",
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
    filterOptionsOccupation(key, childKey, cascadeValue) {
      if (!this.optionsData[key]) return [];

      const filteredOptions = cascadeValue
        ? this.optionsData[key][childKey]?.filter((item) =>
            item.cascade_id?.includes(cascadeValue)
          ) || []
        : this.optionsData[key][childKey];

      return filteredOptions
        ?.filter((item) => item?.id !== "remaining all occupation code")
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

            delete cleaned.family_not_available;

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
        "cif_related_parties",
        "form_meta_data",
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
            ...formData,
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

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": [
          "account_info",
          "has_cif",
          "cif_number",
          "cif_enquiry",
          "dedup_corporate_name",
          "dedup_corporate_registration_number",
          "dedup_corporate_pan_number",
          "dedup_check",
          "dedup_module_data",
          "cif_data",
          "name",
          "alias",
          "registration_number",
          "pan_number",
        ],
        account_info: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:options": {
            onChange: (value) => {
              return this.dropdownReset({
                account_info: value,
                account_type_id: null,
                account_scheme_id: null,
              });
            },
          },
        },
        screening_ref_code: {
          "ui:widget": "hidden",
        },
        cif_data: {
          "ui:widget": "hidden",
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
            onBlur: (events) =>
              setTimeout(() => {
                this.setFormData((prevFormData) => ({
                  ...prevFormData,
                  registration_number: events?.target?.value,
                  dedup_corporate_registration_number: events?.target?.value,
                }));
              }, 600),
          },
        },
        dedup_corporate_pan_number: {
          "ui:options": {
            maxLength: 9,
            onBlur: (events) =>
              setTimeout(() => {
                this.setFormData((prevFormData) => ({
                  ...prevFormData,
                  dedup_corporate_pan_number: events?.target?.value,
                  pan_number: events?.target?.value,
                }));
              }, 600),
          },
        },

        dedup_check: {
          "ui:widget": this.form_status?.includes("init")
            ? "ButtonField"
            : "hidden",
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
            this.form_status?.includes("reporting") ||
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

        cif_enquiry: {
          "ui:widget": "ButtonField",
          "ui:label": false,
          "ui:classNames": "d-flex h-100 mt-5 align-items-center",
          "ui:disabled": this.formData?.guardian_cif_number,
          "ui:options": {
            disableButton: (formData) => !formData?.cif_number?.trim(),
            onClick: (formData) => {
              this.fetchCorporateInfoCIFDetail(null, formData);
            },
          },
        },

        screening: {
          "ui:widget":
            this.form_status?.includes("review") ||
            this.form_status?.includes("approval") ||
            this.form_status?.includes("reporting") ||
            this.form_status?.includes("Completed")
              ? "hidden"
              : "ButtonField",
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
          showViewedColumn: false,
          fixedActionsColumn: true,
          showFooter: true,
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
                screening_card: tableData,
              }));
            },
            actionHandlers: {
              view: (record) => setIsModalVisible(true),
            },
          },
        },
        name: {
          "ui:widget": "hidden",
        },
        alias: {
          "ui:widget": "hidden",
        },
        registration_number: {
          "ui:widget": "hidden",
        },
        pan_number: {
          "ui:widget": "hidden",
        },
      };
    }
  }
  window.UISchemaFactory = UISchemaFactory;
})();
