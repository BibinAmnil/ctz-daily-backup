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
      this.setRenderFormKey = options.setRenderFormKey;
      this.functionGroup = options.functionGroup;
      this.moment = options.moment;
      this.case_id = options.case_id;
      this.NepaliDate = options.NepaliDate;
      this.setModalOpen = options.setModalOpen;
      this.nationalityChanged = false;
      this.setDivide = options.setDivide;
    }

    calculateTotalShares(relatedPartyDesignations) {
      return relatedPartyDesignations.reduce(
        (total, item) => total + (item.shares || 0),
        0
      );
    }

    calculateTotalBeneficialShares(relatedPartyDesignations) {
      return relatedPartyDesignations.reduce(
        (total, item) => total + (item.beneficial_shares || 0),
        0
      );
    }

    customValidate(formData, errors, uiSchema) {
      const cloneFormData = JSON.parse(JSON.stringify(formData));

      // formData?.related_party?.forEach((party, index) => {
      //   const designations = party.related_party_designation || [];

      //   designations.forEach((designation, dIndex) => {
      //     const errPath =
      //       errors?.related_party?.[index]?.related_party_designation?.[dIndex];

      //     // Attach error to `customer_designation` field only
      //     if (!designation.customer_designation && errPath) {
      //       if (!errPath.customer_designation) {
      //         errPath.customer_designation = {
      //           __errors: [],
      //           addError: (msg) =>
      //             errPath.customer_designation.__errors.push(msg),
      //         };
      //       }

      //       errPath.customer_designation.addError(
      //         "Customer designation is required."
      //       );
      //     }
      //   });
      // });

      cloneFormData.related_party = cloneFormData.related_party.map(
        (relatedParty) => ({
          ...relatedParty,
          current_municipality: this.optionsData["local_bodies"]?.find(
            (item) => item?.id === relatedParty?.current_municipality
          )?.title,
          permanent_municipality: this.optionsData["local_bodies"]?.find(
            (item) => item?.id === relatedParty?.permanent_municipality
          )?.title,
          registration_municipality: this.optionsData["local_bodies"]?.find(
            (item) => item?.id === relatedParty?.registration_municipality
          )?.title,
          mailing_municipality: this.optionsData["local_bodies"]?.find(
            (item) => item?.id === relatedParty?.mailing_municipality
          )?.title,
          guardian_current_municipality: this.optionsData["local_bodies"]?.find(
            (item) => item?.id === relatedParty?.guardian_current_municipality
          )?.title,
          guardian_permanent_municipality: this.optionsData[
            "local_bodies"
          ]?.find(
            (item) => item?.id === relatedParty?.guardian_permanent_municipality
          )?.title,
        })
      );
      this.functionGroup?.validateCombinedLength(cloneFormData, errors, {
        type: "registration",
        arrayPath: "related_party",
        fieldNames: {
          town: "ward_number",
          street: "street_name",
          postalCode: "municipality",
        },
      });
      this.functionGroup?.validateCombinedLength(cloneFormData, errors, {
        type: "mailing",
        arrayPath: "related_party",
        fieldNames: {
          town: "ward_number",
          street: "street_name",
          postalCode: "municipality",
        },
      });
      this.functionGroup?.validateCombinedLength(cloneFormData, errors, {
        type: "current",
        arrayPath: "related_party",
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
      this.functionGroup?.validateCombinedLength(cloneFormData, errors, {
        type: "guardian_current",
        arrayPath: "related_party",
        fieldNames: {
          town: "ward_number",
          street: "street_name",
          postalCode: "municipality",
        },
      });
      this.functionGroup?.validateCombinedLength(cloneFormData, errors, {
        type: "guardian_permanent",
        arrayPath: "related_party",
        fieldNames: {
          town: "ward_number",
          street: "street_name",
          postalCode: "municipality",
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
      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "current",
        arrayPath: "related_party",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });
      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "guardian_permanent",
        arrayPath: "related_party",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });
      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "guardian_current",
        arrayPath: "related_party",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });

      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "registration",
        arrayPath: "related_party",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });
      this.functionGroup?.validateCombinedLength(formData, errors, {
        type: "mailing",
        arrayPath: "related_party",
        fieldNames: {
          town: "outside_town",
          street: "outside_street_name",
          postalCode: "postal_code",
        },
      });

      const privateLimitedDomestic = [
        { id: "f3c0e1dd-cb1c-4fd0-9e59-3ce79e212aab", title: "Board Members" },
        { id: "ShareHolder", title: "Shareholders" },
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const publicLimitedDomestic = [
        { id: "f3c0e1dd-cb1c-4fd0-9e59-3ce79e212aab", title: "Board Members" },
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const nonProfitOrganizationDomestic = [
        { id: "2b93f56e-f6cf-4201-ad16-e76760df7c59", title: "Trustee" },
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const publicEnterpriseDomestic = [
        { id: "f3c0e1dd-cb1c-4fd0-9e59-3ce79e212aab", title: "Board Members" },
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const governmentEntityForeign = [
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const governmentEntityDomestic = [
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const privateFirm = [
        { id: "f3c0e1dd-cb1c-4fd0-9e59-3ce79e212aab", title: "Board Members" },
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const partnershipDomestic = [
        { id: "f3c0e1dd-cb1c-4fd0-9e59-3ce79e212aab", title: "Board Members" },
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const policeArmyDefense = [
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const nonProfitOrganizationForeign = [
        { id: "2b93f56e-f6cf-4201-ad16-e76760df7c59", title: "Trustee" },
        { id: "ShareHolder", title: "Shareholders" },
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];
      const others = [
        { id: "f3c0e1dd-cb1c-4fd0-9e59-3ce79e212aab", title: "Board Members" },
        { id: "907ab4ef-6bd3-431a-8be9-aaac95823ddf", title: "Signatory" },
      ];

      const legalEntitiesTitle = this.filterOptions("legal_entities")?.find(
        (item) => item?.value === this.formData?.legal_entity_type
      )?.label;

      function checkRelatedPartyDesignation(
        relatedParty,
        requiredDesignations
      ) {
        if (!relatedParty || !requiredDesignations?.length) {
          return { isValid: false, missingTitles: [] };
        }

        // Collect all designations across all related parties
        const allDesignations = relatedParty.reduce((acc, party) => {
          const partyDesignations =
            party.related_party_designation?.map(
              (designationObj) => designationObj.designation
            ) || [];
          return [...acc, ...partyDesignations];
        }, []);

        const setOfAllDesignations = new Set(allDesignations);
        const missingDesignations = requiredDesignations.filter(
          (req) => !setOfAllDesignations.has(req.id)
        );

        const missingTitles = missingDesignations.map((d) => d.title);

        return {
          isValid: missingDesignations.length === 0,
          missingTitles,
        };
      }

      const getRequiredDesignations = (legalEntityType) => {
        const designationMap = {
          "cb9b167b-7611-4537-a19c-1ce2eec6e0c6": privateLimitedDomestic,
          "438d9ff2-fadb-49e5-a15c-d6f8ac6eb215": publicLimitedDomestic,
          "a04b3c9b-682c-4ef5-ba21-8902da5d8e04": nonProfitOrganizationDomestic,
          "21acc5b0-235c-4ccc-afb7-dee89e332a55": publicEnterpriseDomestic,
          "3999ba0e-b9c0-414b-b346-7bfc2dc383a0": governmentEntityForeign,
          "52918a3f-9272-4322-af73-26a392e5a488": governmentEntityDomestic,
          "f1724b09-17f8-4e9c-b153-06b8de5ee1ec": privateFirm,
          "7de0ddfb-359d-4336-b07a-c34350c3b2f9": partnershipDomestic,
          "b1b9f3f4-62be-47f3-94f6-5e1980864ef4": policeArmyDefense,
          "fd9bfd27-28e7-40ac-8bc4-b58d2003440b": nonProfitOrganizationForeign,
          "a1a7ca82-504e-48ff-bf81-99a1f9d25a06": others,
        };

        return designationMap[legalEntityType] || [];
      };

      const requiredDesignations = getRequiredDesignations(
        formData?.legal_entity_type
      );
      const { isValid, missingTitles } = checkRelatedPartyDesignation(
        formData?.related_party,
        requiredDesignations
      );

      // if (!isValid) {
      //   const entityMessage = `Related Parties : ${missingTitles.join(
      //     ","
      //   )} is mandatory for ${legalEntitiesTitle}`;

      //   this.setModalOpen({
      //     open: true,
      //     message: entityMessage,
      //     status: "error",
      //     close: "Close",
      //   });

      //   errors.addError(entityMessage);
      // }

      const sharesValue = this.calculateTotalShares(
        formData?.related_party
          ?.map((rp) => rp.related_party_designation)
          .flat()
      );

      if (sharesValue > 100) {
        // Find the index of the last related_party
        this.setModalOpen({
          open: true,
          message: `The total shareholder shares percentage exceeded.Current (${sharesValue}%) Please check and correct the values.`,
          status: "error",
          close: "Close",
        });

        errors.addError(
          `The total shareholder shares percentage exceeded.Current (${sharesValue}%) Please check and correct the values.`
        );
        // const lastPartyIndex = (formData?.related_party?.length || 0) - 1;
        // if (lastPartyIndex >= 0) {
        //   const lastParty = formData.related_party[lastPartyIndex];
        //   // Find the index of the last related_party_designation within the last party
        //   const lastDesignationIndex =
        //     (lastParty?.related_party_designation?.length || 0) - 1;

        //   if (lastDesignationIndex >= 0) {
        //     // Add error to the shares field of the last related_party_designation of the last party
        //     errors?.related_party?.[
        //       lastPartyIndex
        //     ]?.related_party_designation?.[
        //       lastDesignationIndex
        //     ]?.shares?.addError(
        //       `Shares(${sharesValue}%). Shares percentage Exceeded`
        //     );
        //   }
        // }
      }

      const beneficialSharesValue = this.calculateTotalBeneficialShares(
        formData?.related_party
          ?.map((rp) => rp.related_party_designation)
          .flat()
      );

      if (beneficialSharesValue > 100) {
        this.setModalOpen({
          open: true,
          message: `The total beneficial shares percentage exceeded.Current (${beneficialSharesValue}%) Please check and correct the values.`,
          status: "error",
          close: "Close",
        });

        errors.addError(
          `The total beneficial shares percentage exceeded.Current (${beneficialSharesValue}%) Please check and correct the values.`
        );
        // Find the index of the last related_party
        // const lastPartyIndex = (formData?.related_party?.length || 0) - 1;
        // if (lastPartyIndex >= 0) {
        //   const lastParty = formData.related_party[lastPartyIndex];
        //   // Find the index of the last related_party_designation within the last party
        //   const lastDesignationIndex =
        //     (lastParty?.related_party_designation?.length || 0) - 1;

        //   if (lastDesignationIndex >= 0) {
        //     // Add error to the beneficialShares field of the last related_party_designation of the last party
        //     errors?.related_party?.[
        //       lastPartyIndex
        //     ]?.related_party_designation?.[
        //       lastDesignationIndex
        //     ]?.beneficial_shares?.addError(
        //       `Beneficial Shares(${beneficialSharesValue}%). Beneficial Shares percentage Exceeded`
        //     );
        //   }
        // }
      }

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

              if (
                (key === "nid_verified" && value === "No") ||
                (key === "guardian_nid_verified" && value === "No")
              ) {
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

      //Check if the User has Viewed the Application
      this.functionGroup?.checkAndAssignScreeningErrors(formData, errors);

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
            shareholder_details: {
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

      const options = filteredOptions.map((item) => ({
        label: item.title,
        value: item?.fg_code || item?.cbs_code || item?.id,
      }));
      return options;
    }

    async formDataCleaner(fields, index) {
      if (typeof this.formData !== "object" || this.formData === null)
        return {};

      const result = {};
      const filterData = this.formData?.related_party?.[index ?? 0];

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
            related_party: prevData?.related_party?.map((item, idx) =>
              index === idx ? result : item
            ),
          })),
        100
      );

      // this.setFormData(result)
      return result;
    }

    async getDedupCheck(index) {
      const nonClearableField = [
        "related_party_designation",
        "is_minor",
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
        "constitution_code_id",
        "customer_status",
      ];
      this.addLoader(["related_party", "dedup_check"], true);
      if (!this.formData?.related_party?.[index]?.first_name) {
        this.toast.error("Enter name for dedup module");
        return;
      }
      !this.formData?.related_party?.[index]?.has_cif &&
        this.formDataCleaner(nonClearableField, index);

      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check`,
          {
            first_name: this.formData?.related_party?.[index].first_name,
            middle_name: this.formData?.related_party?.[index].middle_name,
            last_name: this.formData?.related_party?.[index].last_name,
            father_name: this.formData?.related_party?.[index].father_name,
            id_number: this.formData?.related_party?.[index].dedup_id_number,
            document_type:
              this.formData?.related_party?.[index].dedup_identification,
            citizenship_number: null,
            dob_ad: this.formData?.related_party?.[index].date_of_birth_ad,
            dob_bs: this.formData?.related_party?.[index].date_of_birth_bs,
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
        this.toast.error(error.response?.data?.message);

        return {};
      } finally {
        this.addLoader(["related_party", "dedup_check"], false);
      }
    }

    async getGuardianDedupCheck(index) {
      this.addLoader(["related_party", "guardian_dedup_check"], true);
      const nonClearableField = [
        "related_party_designation",
        "is_minor",
        "guardian_has_cif",
        "guardian_cif_number",
        "guardian_first_name",
        "guardian_middle_name",
        "guardian_last_name",
        "guardian_last_name_not_available",
        "guardian_father_name",
        "guardian_dedup_id_number",
        "dguardian_edup_identification",
        "guardian_date_of_birth_ad",
        "guardian_date_of_birth_bs",
        "guardian_account_info",
        "guardian_account_type_id",
        "guardian_account_scheme_id",
        "guardian_currency",
        "guardian_nationality",
        "guardian_customer_type_id",
        "guardian_constitution_code_id",
        "guardian_customer_status",
      ];
      if (!this.formData?.related_party?.[index]?.guardian_first_name) {
        this.toast.error("Enter guardian name for dedup module");
        return;
      }
      // !this.formData?.related_party?.[index]?.guardian_has_cif &&
      //   this.formDataCleaner(nonClearableField, index);
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check`,
          {
            first_name:
              this.formData?.related_party?.[index]?.guardian_first_name,
            middle_name:
              this.formData?.related_party?.[index]?.guardian_middle_name,
            lastName: this.formData?.related_party?.[index]?.guardian_last_name,
            guardian_father_name:
              this.formData?.related_party?.[index]?.guardian_father_name,
            id_number:
              this.formData?.related_party?.[index]?.guardian_dedup_id_number,
            citizenship_number: null,
            dob_ad:
              this.formData?.related_party?.[index]?.guardian_date_of_birth_ad,
            dob_bs:
              this.formData?.related_party?.[index]?.guardian_date_of_birth_bs,
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
            related_party: prevData?.related_party?.map((item, idx) =>
              index === idx
                ? {
                    ...item,
                    guardian_dedup_module_data: this.preprocessData(resp),
                  }
                : item
            ),
          }));
        }
        this.setRenderFormKey((prev) => prev + 1);
        return;
      } catch (error) {
        this.toast.error(error.response?.data?.message);
        return {};
      } finally {
        this.addLoader(["related_party", "guardian_dedup_check"], false);
      }
    }

    async getDedupCorporateCheck(index) {
      this.addLoader(["related_party", "dedup_corporate_check"], true);
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/dedup-check/corporate`,
          {
            dedup_corporate_name:
              this.formData?.related_party?.[index]?.dedup_corporate_name,
            dedup_corporate_registration_number:
              this.formData?.related_party?.[index]
                ?.dedup_corporate_registration_number,
            dedup_corporate_pan_number:
              this.formData?.related_party?.[index]?.dedup_corporate_pan_number,
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
            related_party: prevData?.related_party?.map((item, idx) =>
              index === idx
                ? {
                    ...item,
                    dedup_corporate_module_data: this.preprocessData(resp),
                  }
                : item
            ),
          }));
        }

        this.setRenderFormKey((prev) => prev + 1);

        return;
      } catch (error) {
        this.toast.error(error.response?.data?.message);

        return {};
      } finally {
        this.addLoader(["related_party", "dedup_corporate_check"], false);
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

    dropdownResetDefault = async (dropdownClearObject, arrayName, index) => {
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

    dropdownResetMultipleLayer = async (
      dropdownClearObject,
      arrayNames,
      indices
    ) => {
      setTimeout(() => {
        this.setFormData((prevFormData) => {
          let data = { ...prevFormData };

          if (
            Array.isArray(arrayNames) &&
            Array.isArray(indices) &&
            arrayNames.length === indices.length
          ) {
            // Traverse down the path
            let current = data;
            for (let i = 0; i < arrayNames.length - 1; i++) {
              const arrayName = arrayNames[i];
              const index = indices[i];
              if (Array.isArray(current[arrayName])) {
                current = current[arrayName][index];
              } else {
                console.warn(
                  `Invalid path: ${arrayName}[${index}] is not an array`
                );
                return prevFormData;
              }
            }

            const lastArrayName = arrayNames[arrayNames.length - 1];
            const lastIndex = indices[indices.length - 1];

            if (
              Array.isArray(current[lastArrayName]) &&
              current[lastArrayName][lastIndex]
            ) {
              current[lastArrayName][lastIndex] = {
                ...current[lastArrayName][lastIndex],
                ...dropdownClearObject,
              };
            } else {
              console.warn(
                `Invalid path at final level: ${lastArrayName}[${lastIndex}]`
              );
              return prevFormData;
            }
          } else {
            console.warn("Invalid arrayNames or indices format.");
            return prevFormData;
          }

          return data;
        });
      }, 100);
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
        national_id_issue_date_ad: [
          "national_id_issue_date_ad",
          "national_id_issue_date_bs",
        ],
        national_id_issue_date_bs: [
          "national_id_issue_date_ad",
          "national_id_issue_date_bs",
        ],
        guardian_national_id_issue_date_ad: [
          "guardian_national_id_issue_date_ad",
          "guardian_national_id_issue_date_bs",
        ],
        guardian_national_id_issue_date_bs: [
          "guardian_national_id_issue_date_ad",
          "guardian_national_id_issue_date_bs",
        ],
        guardian_pan_issue_date_ad: [
          "guardian_pan_issue_date_ad",
          "guardian_pan_issue_date_bs",
        ],
        guardian_pan_issue_date_bs: [
          "guardian_pan_issue_date_ad",
          "guardian_pan_issue_date_bs",
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

      this.setRenderFormKey((prevData) => {
        return prevData + 1;
      });
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
        // ? Clone the entire formData without losing reactivity
        const newData = structuredClone(prev); // Modern alternative to deep cloning

        let currentLevel = newData;
        pathParts.forEach((part, level) => {
          const idx = index[level];

          if (!currentLevel[part]) return;

          if (Array.isArray(currentLevel[part])) {
            currentLevel[part] = currentLevel[part].map((item, i) => {
              if (i === idx) {
                if (level === pathParts.length - 1) {
                  // ? Prevent resetting when selectedDate is empty
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
                return { ...item }; // ? Ensures React detects the change
              }
              return item;
            });
          }

          currentLevel = currentLevel[part]?.[idx] || {};
        });

        return newData;
      });
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
        nationality: "nationalities",
        permanent_country: "countries",
        permanent_province: "provinces",
        permanent_district: "districts",
        permanent_municipality: "local_bodies",
        current_country: "countries",
        salutation: "salutations",
        current_province: "provinces",
        current_district: "districts",
        current_municipality: "local_bodies",
        family_member_relation: "relationships",
        id_type_id: "document_types",
        dedup_identification: "document_types",
        issue_country: "countries",
        issued_district: "districts",
        mobile_country_code: "country_codes",
        phone_country_code: "country_codes",
        issuing_authority: "issuing_authorities",
        pep_relationsip: "relationships",
        relation_with_account_holder: "relationships",
        family_account_holder: "relationship_status",
        occupation_type: "occupations",
        source_of_income: "income_sources",
        business_type: "business_type",
        organization_type: "legal_entities",
        designation: "corporate_relation_types",
        customer_designation: "corporate_relation",
        constitution_code_id: "constitution_types",
        marital_status: "marital_status",
        account_purpose: "account_purposes",
        currency: "currencies",
        registration_authority: "issuing_authorities",
        country_of_incorporation: "countries",
        pan_place_of_issue: "districts",
        pan_issue_place: "districts",
        country_code: "country_codes",
        business_type: "business_type",
        mobile_country_code: "country_codes",

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
        educational_qualification: "education_qualifications",
        // organization field mapping
        account_purpose: "account_purposes",
        currency: "currencies",
        registration_authority: "issuing_authorities",
        country_of_incorporation: "countries",
        pan_place_of_issue: "districts",
        pan_issue_place: "districts",
        country_code: "country_codes",
        business_type: "business_type",
        business_type_id: "business_type",
        type_of_transaction: "business_type",
        mobile_country_code: "country_codes",

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
        legal_entity_type: "legal_entities",
        entity_class: "entity_classes",
        existing_risk_rating: "risk_categories",
        guardian_existing_risk_rating: "risk_categories",
        gender: "genders",
        guardian_gender: "genders",
        guardian_dedup_identification: "document_types",
        guardian_related_party_relation_with_account_holder: "relationships",
      };

      const dataKey = fieldMapping[fieldKey] || fieldKey;
      let fieldOptions = optionsData[dataKey] || [];

      if (cascadeId !== null) {
        fieldOptions = this.filterOptionsByCascadeId(fieldOptions, cascadeId);
      }

      const enumValues = [
        ...new Set(
          fieldOptions.map((option) =>
            String(option?.fg_code || option?.cbs_code || option?.id)
          )
        ),
      ];
      const enumNames = fieldOptions.map((option) => option.title);

      setJsonSchema((prevSchema) => {
        if (!prevSchema) return prevSchema;

        const updateSchema = (schema) => {
          if (!schema) return;

          if (schema.properties && schema.properties[fieldKey]) {
            const field = schema.properties[fieldKey];
            if (field.type === "string" || field.type === "array") {
              field.enum = [...enumValues];
              //field.enumNames = [...enumNames];
              field.selectOptions = enumValues.map((value, index) => ({
                value,
                label: enumNames[index],
              }));
            }
          }

          // Recursively update nested objects/arrays
          if (schema.properties) {
            Object.values(schema.properties).forEach(updateSchema);
          }
          if (schema.items?.properties) {
            updateSchema(schema.items);
          }

          if (schema.allOf) {
            for (const depKey in schema.allOf) {
              const dependency = schema.allOf[depKey];
              if (dependency.oneOf || dependency.anyOf) {
                (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
                  if (depSchema.properties) updateSchema(depSchema);
                });
              } else if (dependency.if) {
                if (dependency.then) updateSchema(dependency.then);
                if (dependency.else) updateSchema(dependency.else);
              } else if (dependency.oneOf || dependency.anyOf) {
                (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
                  if (depSchema.properties) updateSchema(depSchema);
                });
              }
            }
          }
          if (schema.dependencies) {
            for (const depKey in schema.dependencies) {
              const dependency = schema.dependencies[depKey];
              if (dependency.properties) {
                updateSchema(dependency);
              } else if (dependency.oneOf || dependency.anyOf) {
                (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
                  if (depSchema.properties) updateSchema(depSchema);
                });
              } else if (dependency.if) {
                if (dependency.then) updateSchema(dependency.then);
                if (dependency.else) updateSchema(dependency.else);
              } else if (dependency.oneOf || dependency.anyOf) {
                (dependency.oneOf || dependency.anyOf).forEach((depSchema) => {
                  if (depSchema.properties) updateSchema(depSchema);
                });
              }
            }
          }
        };

        const updateDefinitions = (definitions) => {
          if (!definitions) return;
          Object.keys(definitions).forEach((key) => {
            if (key === fieldKey) {
              const def = definitions[key];
              if (def.type === "string" || def.type === "array") {
                def.enum = enumValues;
                def.enumNames = enumNames;
              }
            }
            // Recursively update nested definitions
            updateSchema(definitions[key]);
          });
        };

        const updatedSchema = { ...prevSchema };

        // Update both properties and definitions
        updateSchema(updatedSchema);
        if (updatedSchema.definitions) {
          updateDefinitions(updatedSchema.definitions);
        }

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

    async initializeSchema(setJsonSchema, formData) {
      if (!this.form_status?.includes("case-init")) {
        this.setDivide(true);
      }

      const fieldsToUpdate = [
        "nationality",
        "permanent_country",
        "permanent_province",
        "permanent_district",
        "permanent_municipality",
        "salutation",
        "current_country",
        "current_province",
        "current_district",
        "current_municipality",
        "mobile_country_code",
        "phone_country_code",
        "family_member_relation",
        "id_type_id",
        "issue_country",
        "issued_district",
        "issuing_authority",
        "pep_relationsip",
        "occupation_type",
        "source_of_income",
        "business_type",
        "dedup_identification",
        "organization_type",
        "designation",
        "customer_designation",
        "customer_type_id",
        "constitution_code_id",
        "marital_status",
        "account_purpose",
        "currency",
        "constitution_Code",
        "registration_authority",
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

        "pan_issue_place",
        "mobile_country_code",

        "legal_entity_type",

        "educational_qualification",
        // organization fieldsToUpdate
        "account_purpose",
        "currency",
        "constitution_Code",
        "registration_authority",
        "country_of_incorporation",
        "pan_place_of_issue",
        "license_issuing_authority",
        "registration_country",
        "registration_province",
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
        "business_type",
        "type_of_transaction",

        "pan_issue_place",
        "mobile_country_code",

        "legal_entity_type",
        "entity_class",
        "existing_risk_rating",
        "guardian_existing_risk_rating",
        "gender",
        "guardian_gender",
        "guardian_dedup_identification",
        "guardian_related_party_relation_with_account_holder",
      ];

      // if (formData?.cif_data) {
      //   setTimeout(
      //     () =>
      //       this.setUiSchema((prevSchema) => {
      //         const updatedUiSchema = { ...prevSchema };

      //         for (const key in formData?.cif_data) {
      //           const data = formData?.cif_data[key];
      //           const existing = updatedUiSchema[key];

      //           const shouldDisableArray =
      //             Array.isArray(data) && data.length > 0
      //               ? data.some((item) => Object.keys(item || {}).length > 0)
      //               : !!data;

      //           if (!shouldDisableArray) continue;

      //           if (existing?.items) {
      //             updatedUiSchema[key] = {
      //               ...existing,
      //               "ui:options": {
      //                 ...(existing["ui:options"] || {}),
      //                 addable: false,
      //                 removable: false,
      //                 orderable: false,
      //               },
      //               "ui:disabled": true,
      //               items: {
      //                 ...(existing?.items || {}),
      //                 "ui:disabled": true,
      //               },
      //             };
      //           } else {
      //             updatedUiSchema[key] = {
      //               ...existing,
      //               "ui:disabled": true,
      //             };
      //           }
      //         }

      //         return updatedUiSchema;
      //       }),
      //     100
      //   );
      // }

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
        const checkCorporate = this.formData?.related_party?.[
          index
        ]?.related_party_designation?.find(
          (item) => item?.customer_designation === "Organization"
        );
        const baseUrl = `${this.mainRouteURL}/external-api/cif-enquiry`;
        const response = await this.axios.post(
          `${baseUrl}${checkCorporate ? "/corporate" : ""}`,
          {
            cif_number:
              this.formData?.related_party?.[index]?.cif_number ?? cif_id,
            is_minor: this.formData?.related_party?.[index]?.is_minor || false,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }

        const resp = response?.data?.data;
        if (resp)
          this.setFormData((prevFormData) => {
            let updatedDetails = [...prevFormData?.related_party];

            updatedDetails[index] = {
              ...updatedDetails[index],
              ...resp,
              cif_data: resp,
              ...(checkCorporate && {
                dedup_corporate_name: resp?.name,
                dedup_corporate_registration_number: resp?.registration_number,
                dedup_corporate_pan_number: resp?.pan_number,
              }),
            };

            const newFormData = {
              ...prevFormData,
              related_party: updatedDetails,
            };

            // Log the final form data
            console.log("New form data:", newFormData);

            return newFormData;
          }),
            console.log("Form Data :: ", this.formData);
        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        error?.response &&
          this.setModalOpen({
            open: true,
            message:
              error.response?.data?.message ?? error?.response?.statusText,
            status: "error",
            close: "Close",
          });
        return {};
      } finally {
        this.addLoader(["related_party", "cif_enquiry"], false);
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
                  personal_screening_data: this.preprocessData(resp),
                }
              : item
          ),
        }));
        this.setRenderFormKey((prev) => prev + 1);
        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
      } finally {
        this.addLoader(["related_party", "personal_info_screening"], false);
      }
    }

    async fetchRelatedPartyGuardianInfoScreening(index) {
      if (!this.formData?.related_party?.[index]?.guardian_first_name) {
        this.toast.error("Please enter a First Name");
        return;
      }
      this.addLoader(
        ["related_party", "guardian_personal_info_screening"],
        true
      );
      try {
        let payload = {
          first_name:
            this.formData?.related_party?.[index]?.guardian_first_name,
          middle_name:
            this.formData?.related_party?.[index]?.guardian_middle_name,
          last_name: this.formData?.related_party?.[index]?.guardian_last_name,
          father_name:
            this.formData?.related_party?.[index]?.guardian_father_name,
          identification_number:
            this.formData?.related_party?.[index]
              ?.guardian_identification_number,
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
                  guardian_personal_screening_data: this.preprocessData(resp),
                }
              : item
          ),
        }));
        this.setRenderFormKey((prev) => prev + 1);
        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
      } finally {
        this.addLoader(
          ["related_party", "guardian_personal_info_screening"],
          false
        );
      }
    }

    async fetchOrganizationRelatedPartyInfoScreening(index) {
      if (
        !(
          this.formData?.related_party?.name ||
          this.formData?.related_party?.[index]?.name
        )
      ) {
        this.toast.error("Please enter a Organization Name");
        return;
      }
      this.addLoader(["related_party", "screening"], true);
      try {
        let payload = {
          name:
            this.formData?.related_party?.name ||
            this.formData?.related_party?.[index]?.name,
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
                  screening_card: this.preprocessData(resp),
                }
              : item
          ),
        }));
        this.setRenderFormKey((prev) => prev + 1);
        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
      } finally {
        this.addLoader(["related_party", "screening"], false);
      }
    }

    getRiskData(index, prefix) {
      // Non-array index: top-level only
      const relatedPartyItem = this.formData?.related_party?.[index];
      if (!relatedPartyItem) {
        throw new Error(`No related_party item found at index: ${index}`);
      }

      // If the prefix is "guardian", filter keys with "guardian_"
      if (prefix === "guardian") {
        const guardianData = {};
        for (const key in relatedPartyItem) {
          if (key.startsWith("guardian_")) {
            guardianData[key] = relatedPartyItem[key];
          }
        }
        return guardianData;
      } else if (prefix === "individual") {
        const individualData = {};
        for (const key in relatedPartyItem) {
          if (!key.startsWith("guardian_")) {
            individualData[key] = relatedPartyItem[key];
          }
        }
        return individualData;
      }

      // Return the original object if prefix isn't "guardian"
      return relatedPartyItem;
    }

    async calculateRiskDynamic(index) {
      try {
        // Show loader while risk calculation is happening
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

        // Dynamically retrieve the data based on index or path
        const riskData = this.getRiskData(index, "individual"); // Implement this method based on form data structure

        // Perform the network request to calculate the risk
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...riskData,
            category: "individual",
            id: this.case_id,
          }
        );

        if (response) {
          this.toast.success("Risk calculation successful");
          const resp = response?.data;

          // Update form data with the received risk level and score
          this.setFormData((prevData) => {
            const newData = { ...prevData };

            if (Array.isArray(index)) {
              if (index.length === 1) {
                // Level 1 update
                newData.related_party[index[0]] = {
                  ...newData.related_party[index[0]],
                  risk_level: resp?.risk_level,
                  risk_score: resp?.risk_score,
                };
              }
            } else {
              // Single level index
              newData.related_party[index] = {
                ...newData.related_party[index],
                risk_level: resp?.risk_level,
                risk_score: resp?.risk_score,
              };
            }

            return newData;
          });
        }

        return;
      } catch (error) {
        console.error("Error fetching risk data:", error);
        this.toast.error(error?.response?.data?.message);
        return {};
      } finally {
        // Hide the loader once the process is finished
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

    async calculateGuardianRiskDynamic(index) {
      try {
        // Show loader while risk calculation is happening
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          related_party: {
            ...prevUiSchema.related_party,
            items: {
              ...prevUiSchema.related_party.items,
              guardian_calculate_risk: {
                ...prevUiSchema.related_party.items.guardian_calculate_risk,
                "ui:options": {
                  ...prevUiSchema.related_party.items.guardian_calculate_risk?.[
                    "ui:options"
                  ],
                  show_loader: true,
                },
              },
            },
          },
        }));

        // Dynamically retrieve the data based on index or path
        const riskData = this.getRiskData(index, "guardian"); // Implement this method based on form data structure

        // Perform the network request to calculate the risk
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/risk-check`,
          {
            ...riskData,
            category: "individual",
            id: this.case_id,
            guardian_risk_check: true,
          }
        );

        if (response) {
          this.toast.success("Risk calculation successful");

          const resp = response?.data;

          // Update form data with the received risk level and score
          this.setFormData((prevData) => {
            const newData = { ...prevData };

            if (Array.isArray(index)) {
              if (index.length === 1) {
                // Level 1 update
                newData.related_party[index[0]] = {
                  ...newData.related_party[index[0]],
                  guardian_risk_level: resp?.risk_level,
                  guardian_risk_score: resp?.risk_score,
                };
              }
            } else {
              // Single level index
              newData.related_party[index] = {
                ...newData.related_party[index],
                guardian_risk_level: resp?.risk_level,
                guardian_risk_score: resp?.risk_score,
              };
            }

            return newData;
          });
        }

        return;
      } catch (error) {
        console.error("Error fetching risk data:", error);
        this.toast.error(error?.response?.data?.message);
        return {};
      } finally {
        // Hide the loader once the process is finished
        this.setUiSchema((prevUiSchema) => ({
          ...prevUiSchema,
          related_party: {
            ...prevUiSchema.related_party,
            items: {
              ...prevUiSchema.related_party.items,
              guardian_calculate_risk: {
                ...prevUiSchema.related_party.items.guardian_calculate_risk,
                "ui:options": {
                  ...prevUiSchema.related_party.items.guardian_calculate_risk?.[
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

    async updateFormAndSchema(formData, schemaConditions) {
      this.formData = formData;
      (this.form_status?.includes("review") ||
        this.form_status?.includes("approval") ||
        this.form_status?.includes("Completed")) &&
        this.setNextStep("ncna-corporate-cdd");
    }

    async fetchCorporateInfoCIFDetail() {
      this.addLoader("cif_enquiry", true);
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number: this.formData.cif_number,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data;

        this.setFormData(resp);

        return;
      } catch (error) {
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
          is_existing_cif: false,
          scheme_check: false,
          is_cib_list: false,
          is_block_list: false,
          is_sanction: false,
          aml_risk_rating: "low",
        }));

        return;
      } catch (error) {
        console.error("Error fetching options:", error);
        return {};
      } finally {
        this.addLoader("screening", false);
        this.renderForm();
      }
    }

    async fetchGuardianCifEnquiry(index, cifId) {
      this.addLoader(["related_party", "guardian_cif_enquiry"], true);
      try {
        const response = await this.axios.post(
          `${this.mainRouteURL}/external-api/cif-enquiry`,
          {
            cif_number:
              cifId ??
              this.formData?.related_party?.[index]?.guardian_cif_number,
          }
        );
        if (!response) {
          throw new Error("Network response was not ok");
        }
        const resp = response?.data?.data;
        const prefixAddedData = this.addPrefixToKeys(resp, "guardian_");

        if (resp) {
          this.setFormData((prevFormData) => {
            let updatedDetails = [...prevFormData?.related_party];

            // Add debug logs to check values
            console.log("Previous details:", updatedDetails[index]);
            console.log("Response data:", resp);

            updatedDetails[index] = {
              ...updatedDetails[index],
              ...prefixAddedData,
              guardian_cif_data: prefixAddedData,
            };

            // Log the final updated object
            console.log("Final updated details:", updatedDetails[index]);

            const newFormData = {
              ...prevFormData,
              related_party: updatedDetails,
            };

            // Log the final form data
            console.log("New form data:", newFormData);

            return newFormData;
          });
        }

        // setTimeout(
        //   () =>
        //     this.setUiSchema((prevSchema) => {
        //       const updatedUiSchema = { ...prevSchema };

        //       for (const key in this.formData?.related_party?.[index]
        //         ?.guardian_cif_data) {
        //         const data =
        //           this.formData?.related_party?.[index]?.guardian_cif_data[
        //             key
        //           ];
        //         const existing = updatedUiSchema[key];

        //         const shouldDisableArray =
        //           Array.isArray(data) && data.length > 0
        //             ? data.some(
        //                 (item) => Object.keys(item || {}).length > 0
        //               )
        //             : !!data;

        //         if (!shouldDisableArray) continue;

        //         if (existing?.items) {
        //           updatedUiSchema[key] = {
        //             ...existing,
        //             "ui:options": {
        //               ...(existing["ui:options"] || {}),
        //               addable: false,
        //               removable: false,
        //               orderable: false,
        //             },
        //             "ui:disabled": true,
        //             items: {
        //               ...(existing?.items || {}),
        //               "ui:disabled": true,
        //             },
        //           };
        //         } else {
        //           updatedUiSchema[key] = {
        //             ...existing,
        //             "ui:disabled": true,
        //           };
        //         }
        //       }

        //       return updatedUiSchema;
        //     }),
        //   100
        // );
        return;
      } catch (error) {
        console.error("Error fetching options:", error);

        return {};
      } finally {
        this.addLoader(["related_party", "guardian_cif_enquiry"], false);
      }
    }

    createUISchema(options) {
      this.nationalityChanged = true;
      const {
        setJsonSchema,
        formData,
        jsonSchema,
        setFormData,
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

      const sameAsRegisteredAddressChange = (value, index) => {
        setFormData((prevFormData) => ({
          ...prevFormData,
          related_party: prevFormData?.related_party?.map((item, arrayIndex) =>
            arrayIndex === index
              ? {
                  ...item,
                  same_as_registered_address: value,
                  mailing_country: item.registration_country,
                  mailing_province: value ? item.registration_province : null,
                  mailing_district: value ? item.registration_district : null,
                  mailing_municipality: value
                    ? item.registration_municipality
                    : null,
                  mailing_ward_number: value
                    ? item.registration_ward_number
                    : null,
                  mailing_street_name: value
                    ? item.registration_street_name || item.registration_street
                    : null,
                  mailing_town: value ? item.registration_town : null,
                  mailing_house_number: value
                    ? item.registration_house_number
                    : null,
                  mailing_street: value
                    ? item.registration_street || item.registration_street_name
                    : null,
                  mailing_postal_code: value
                    ? item.registration_postal_code
                    : null,
                }
              : item
          ),
        }));
        this.setRenderFormKey((prev) => prev + 1);
        setJsonSchema((prevJson) => {
          const dependentKeys = [
            "mailing_country",
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

      const sameAsPermanentOnChange = (value, index) => {
        setFormData((prevFormData) => ({
          ...prevFormData,
          related_party: prevFormData?.related_party?.map(
            (arrayItem, arrayIndex) =>
              arrayIndex === index
                ? {
                    ...arrayItem,
                    same_as_permanent: value,
                    current_country: arrayItem.permanent_country,
                    current_province: value
                      ? arrayItem.permanent_province
                      : null,
                    current_district: value
                      ? arrayItem.permanent_district
                      : null,
                    current_municipality: value
                      ? arrayItem.permanent_municipality
                      : null,
                    current_ward_number: value
                      ? arrayItem.permanent_ward_number
                      : null,
                    current_street_name: value
                      ? arrayItem.permanent_street_name
                      : null,
                    current_town: value ? arrayItem.permanent_town : null,
                    current_house_number: value
                      ? arrayItem.permanent_house_number
                      : null,
                    current_street: value ? arrayItem.permanent_street : null,
                    current_postal_code: value
                      ? arrayItem.permanent_postal_code
                      : null,
                    current_outside_town: value
                      ? arrayItem.permanent_outside_town
                      : null,
                    current_outside_street_name: value
                      ? arrayItem.permanent_outside_street_name
                      : null,
                  }
                : arrayItem
          ),
        }));
        this.setRenderFormKey((prev) => prev + 1);
        setJsonSchema((prevJson) => {
          const dependentKeys = [
            "current_country",
            "current_province",
            "current_district",
            "current_municipality",
            "current_ward_number",
            "current_street",
            "current_town",
            "current_house_number",
          ];

          return this.updateSchemaReadonly(prevJson, dependentKeys, value);
        });
      };

      const sameAsGuardianPermanentOnChange = (value, index) => {
        setFormData((prevFormData) => ({
          ...prevFormData,
          related_party: prevFormData?.related_party?.map(
            (arrayItem, arrayIndex) =>
              arrayIndex === index
                ? {
                    ...arrayItem,
                    guardian_same_as_permanent: value,
                    guardian_current_country:
                      arrayItem.guardian_permanent_country,
                    guardian_current_province: value
                      ? arrayItem.guardian_permanent_province
                      : null,
                    guardian_current_district: value
                      ? arrayItem.guardian_permanent_district
                      : null,
                    guardian_current_municipality: value
                      ? arrayItem.guardian_permanent_municipality
                      : null,
                    guardian_current_ward_number: value
                      ? arrayItem.guardian_permanent_ward_number
                      : null,
                    guardian_current_street_name: value
                      ? arrayItem.guardian_permanent_street_name
                      : null,
                    guardian_current_town: value
                      ? arrayItem.guardian_permanent_town
                      : null,
                    guardian_current_house_number: value
                      ? arrayItem.guardian_permanent_house_number
                      : null,
                    guardian_current_street: value
                      ? arrayItem.guardian_permanent_street
                      : null,
                    guardian_current_postal_code: value
                      ? arrayItem.guardian_permanent_postal_code
                      : null,
                    guardian_current_outside_town: value
                      ? arrayItem.guardian_permanent_outside_town
                      : null,
                    guardian_current_outside_street_name: value
                      ? arrayItem.guardian_permanent_outside_street_name
                      : null,
                  }
                : arrayItem
          ),
        }));
        this.setRenderFormKey((prev) => prev + 1);
        setJsonSchema((prevJson) => {
          const dependentKeys = [
            "guardian_current_country",
            "guardian_current_province",
            "guardian_current_district",
            "guardian_current_municipality",
            "guardian_current_ward_number",
            "guardian_current_street",
            "guardian_current_town",
            "guardian_current_house_number",
          ];

          return this.updateSchemaReadonly(prevJson, dependentKeys, value);
        });
      };
      // const addMoreDisable =
      // this.formData?.related_party?.[index[0]]?.related_party_designation[0]
      //   ?.designation === "ShareHolder";
      this.initializeSchema(setJsonSchema, formData);

      return {
        "ui:ObjectFieldTemplate": ObjectFieldTemplate,
        "ui:order": ["account_info", "legal_entity_type", "related_party"],
        account_info: {
          "ui:widget": "hidden",
          "ui:label": false,
          "ui:options": {},
        },
        legal_entity_type: {
          "ui:widget": "hidden",
          "ui:label": false,
        },
        related_party: {
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
            "ui:order": [
              //CheckBox Fields
              "related_party_designation",
              "is_minor",
              "has_cif",
              "cif_number",
              "cif_enquiry",

              //DEDUP Fields (Company)
              "dedup_corporate_name",
              "dedup_corporate_registration_number",
              "dedup_corporate_pan_number",
              "dedup_corporate_check",
              "dedup_corporate_module_data",

              // Company Fields
              "name",
              "alias",
              "nationality",
              "customer_type_id",
              "constitution_code_id",
              "insurance_type",
              "tax_percentage",
              "extra_gap",
              "key_contact_person",
              "legal_entity_type",
              "business_type_id",
              "classification_depositors",
              "entity_class",
              "sectors",
              "sub_sectors",
              //DEDUP Fields (Individual)
              "first_name",
              "middle_name",
              "last_name",
              "last_name_not_available",
              "father_name",
              "date_of_birth_ad",
              "date_of_birth_bs",
              "dedup_identification",
              "dedup_id_number",

              //Common Dedup Check Button and Data Display
              "dedup_check",
              "dedup_module_data",

              //Account Information
              "account_purpose",
              "type_of_transaction",

              // Individual Information
              "salutation",
              "gender",
              "marital_status",
              "email",
              "email_not_available",
              "nrn_resident",
              "literacy",
              "educational_qualification",
              "family_information",

              //Registration Detail
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

              // company address
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
              "mailing_street_name",
              "mailing_town",
              "mailing_house_number",
              "mailing_postal_code",
              "contact_details",

              //Identification
              "id_type_details",

              //National ID
              "national_id_number",
              "national_id_issue_date_ad",
              "national_id_issue_date_bs",
              "national_id_issue_place",
              "national_id_issuing_authority",
              "nid_verified",
              "nid_verify",
              "nid_reset",

              // PAN Number
              "pan_number",
              "pan_issue_date_ad",
              "pan_issue_date_bs",
              "pan_issue_place",
              "pan_issuing_authority",

              // Individual Address
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
              "current_spent_day",

              // Contact Address
              "contact_type",
              "mobile_country_code",
              "mobile_number",
              "phone_country_code",
              "phone_number",

              "organization_id_type_details",

              "occupation_type",
              "source_of_income",
              "occupation_detail",

              "screening",
              "screening_card",
              "personal_info_screening",
              "personal_screening_data",

              // transaction
              "most_recent_audit_report",
              "fund_source",
              "income_year",
              "declared_anticipated_annual_transaction",
              "expected_anticipated_annual_transaction",
              "number_of_transaction",
              "yearly_income",
              "transaction_justification",
              "transaction_fund_details",
              "introducer_walk_in_customer",
              "introducer_bank_staff_id",
              "introducer_bank_staff_acount_number",
              "introducer_bank_staff_name",
              "introducer_account_holder_number",
              "introducer_account_holder_name",
              "beneficial_owner",

              "pep",
              "pep_category",
              "pep_name",
              "pep_relationship",
              "pep_declaration",

              "adverse_media",
              "adverse_category",
              "family_pep_declaration",
              "beneficial_owner",
              "beneficial_name",
              "beneficial_relationship",
              "crime_in_past",
              "crime_description",
              "residential_permit",
              "permit_description",
              "customer_status",
              "is_us_person",

              "ac_with_other_bank",
              "other_bank_acc",
              "has_nominee",
              "nominee_full_name",
              "relation_to_nominee",
              "nominee_father_name",
              "nominee_grandfather_name",
              "nominee_contact_number",
              "collect",
              "email_template",
              "ancillary_email",
              "need_check_book",
              "need_mobile_banking",
              "debit_card",
              "need_locker",
              "locker_type",
              "account_holder_relationship",

              "existing_risk_rating",

              "loan_status",
              "is_blacklisted",
              "customer_introduce_by",
              "introducer_account_number",
              "customer_name",
              "employee_id",
              "met_in_person",

              "has_nominee",
              "nominee_full_name",
              "relation_to_nominee",
              "nominee_father_name",
              "nominee_grandfather_name",
              "nominee_contact_number",
              "risk_level",
              "calculate_risk",
              "risk_score",
              "cif_data",

              "guardian_has_cif",
              "guardian_cif_number",
              "guardian_cif_enquiry",
              "guardian_nationality",
              "guardian_customer_type_id",
              "guardian_constitution_code_id",
              "guardian_first_name",
              "guardian_middle_name",
              "guardian_last_name",
              "guardian_last_name_not_available",
              "guardian_father_name",
              "guardian_date_of_birth_ad",
              "guardian_date_of_birth_bs",
              "guardian_dedup_identification",
              "guardian_dedup_id_number",
              "extra_gap",
              "guardian_dedup_check",
              "guardian_dedup_module_data",
              "guardian_related_party_family_account_holder",
              "guardian_related_party_relation_with_account_holder",
              "guardian_salutation",
              "guardian_gender",
              "guardian_marital_status",
              "guardian_email",
              "guardian_email_not_available",
              "guardian_nrn_resident",
              "guardian_literacy",
              "guardian_educational_qualification",
              "guardian_family_information",
              "guardian_national_id_number",
              "guardian_national_id_issue_date_ad",
              "guardian_national_id_issue_date_bs",
              "guardian_national_id_issue_place",
              "guardian_national_id_issuing_authority",
              "guardian_nid_verified",
              "guardian_nid_verify",
              "guardian_nid_reset",
              "guardian_pan_number",
              "guardian_pan_issue_date_ad",
              "guardian_pan_issue_date_bs",
              "guardian_pan_issue_place",
              "guardian_pan_issuing_authority",
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
              "guardian_current_spent_day",
              "guardian_contact_type",
              "guardian_mobile_country_code",
              "guardian_mobile_number",
              "guardian_phone_country_code",
              "guardian_phone_number",
              "guardian_id_type_details",
              "guardian_occupation_type",
              "guardian_source_of_income",
              "guardian_business_type",
              "guardian_occupation_detail",
              "guardian_declared_anticipated_annual_transaction",
              "guardian_expected_anticipated_annual_transaction",
              "guardian_number_of_transaction",
              "guardian_yearly_income",
              "guardian_transaction_justification",
              "guardian_transaction_fund_details",
              "guardian_personal_info_screening",
              "guardian_personal_screening_data",

              "guardian_pep",
              "guardian_pep_category",
              "guardian_pep_declaration",
              "guardian_adverse_media",
              "guardian_adverse_category",
              "guardian_family_pep_declaration",
              "guardian_crime_in_past",
              "guardian_crime_description",
              "guardian_existing_risk_rating",
              "guardian_loan_status",
              "guardian_is_blacklisted",
              "guardian_residential_permit",
              "guardian_permit_description",
              "guardian_is_us_person",
              "guardian_ac_with_other_bank",
              "guardian_other_bank_acc",
              "guardian_customer_introduce_by",
              "guardian_introducer_account_number",
              "guardian_employee_id",
              "guardian_met_in_person",
              "guardian_cif_data",
              "guardian_risk_level",
              "guardian_calculate_risk",
              "guardian_risk_score",
            ],
            cif_data: {
              "ui:widget": "hidden",
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
                    this.setModalOpen({
                      open: true,
                      message: responseData?.data?.message,
                      close: "Close",
                      status: "success",
                    });
                    this.setFormData((prevForm) => ({
                      ...prevForm,
                      related_party: prevForm?.related_party?.map((item, idx) =>
                        idx === index
                          ? {
                              ...item,
                              nid_verified:
                                responseData?.resCod == "200" ? "Yes" : "No",
                            }
                          : item
                      ),
                    }));
                  } catch (err) {
                    this.setModalOpen({
                      open: true,
                      message: err?.response?.data?.message,
                      close: "Close",
                      status: "error",
                    });
                  } finally {
                    this.addLoader(["related_party", "nid_verify"], false);
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
                    index ?? 0
                  );
                },
              },
            },

            guardian_nid_verify: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
              "ui:label": false,
              "ui:classNames": "mt-5 w-100",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[index]
                    ?.guardian_national_id_number,
                buttonClassName: "w-100",
                onClick: async (index, formData) => {
                  this.addLoader(
                    ["related_party", "guardian_nid_verify"],
                    true
                  );
                  try {
                    const response = await this.axios.post(
                      `${this.mainRouteURL}/external-api/verify-nid`,
                      {
                        nin: formData?.related_party?.[index]
                          ?.guardian_national_id_number,
                        first_name:
                          formData?.related_party?.[index]?.guardian_first_name,
                        last_name:
                          formData?.related_party?.[index]?.guardian_last_name,
                        middle_name:
                          formData?.related_party?.[index]
                            ?.guardian_middle_name,
                        date_of_birth:
                          formData?.related_party?.[index]
                            ?.guardian_date_of_birth_ad,
                      }
                    );

                    const responseData = response?.data;
                    this.setModalOpen({
                      open: true,
                      message: responseData?.data?.message,
                      close: "Close",
                      status: "success",
                    });
                    this.setFormData((prevForm) => ({
                      ...prevForm,
                      related_party: prevForm?.related_party?.map((item, idx) =>
                        idx === index
                          ? {
                              ...item,
                              guardian_nid_verified:
                                responseData?.resCod == "200" ? "Yes" : "No",
                            }
                          : item
                      ),
                    }));
                  } catch (err) {
                    this.setModalOpen({
                      open: true,
                      message: err?.response?.data?.message,
                      close: "Close",
                      status: "error",
                    });
                  } finally {
                    this.addLoader(
                      ["related_party", "guardian_nid_verify"],
                      false
                    );
                  }
                },
              },
            },

            guardian_nid_reset: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
              "ui:label": false,
              "ui:classNames": "mt-5 w-100",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[index]?.guardian_nid_verified,
                buttonClassName: "w-100",
                onClick: async (index) => {
                  this.dropdownReset(
                    {
                      guardian_national_id_number: null,
                      guardian_national_id_issue_date_ad: "",
                      guardian_national_id_issue_date_bs: "",
                      guardian_national_id_issue_place: "",
                      guardian_nid_verified: "",
                    },
                    "related_party",
                    index ?? 0
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
            guardian_declared_anticipated_annual_transaction: {
              "ui:options": {
                addonBefore: "Customer",
                amount: true,
              },
            },
            guardian_expected_anticipated_annual_transaction: {
              "ui:options": {
                addonBefore: "Branch",
                amount: true,
              },
            },
            guardian_yearly_income: {
              "ui:options": {
                amount: true,
              },
            },
            guardian_cif_data: {
              "ui:widget": "hidden",
            },

            organization_id_type_details: {
              "ui:options": {
                addable: false,
                orderable: false,
                removable: false,
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
                  "nrn_card_number",
                  "comment",
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
                  // "ui:widget": "CascadeDropdown",
                  // "ui:options": {
                  //   getOptions: () => {
                  //     const option = this.filterOptions("countries");
                  //     return option;
                  //   },
                  //   setDisabled: (formData, index) =>
                  //     this.formData?.related_party?.[index]
                  //       ?.guardian_nationality === "NP",
                  // },
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
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.related_party?.[
                        index[0]
                      ]?.id_type_details?.map((item) =>
                        this.moment(
                          formData?.related_party?.[index[0]]?.date_of_birth_ad
                        )
                          .add(
                            formData?.related_party?.[index[0]]?.is_minor
                              ? 1
                              : 16,
                            formData?.related_party?.[index[0]]?.is_minor
                              ? "day"
                              : "years"
                          )
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
                        "related_party.organization_id_type_details"
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
                      const minDateValue = formData?.related_party?.[
                        index[0]
                      ]?.id_type_details?.map((item) =>
                        this.NepaliDate.parseEnglishDate(
                          this.moment(
                            formData?.related_party?.[index[0]]
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
                        "related_party.organization_id_type_details"
                      );
                    },
                  },
                },

                id_expiry_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Expiry Date (A.D)",
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
                        "related_party.organization_id_type_details"
                      );
                    },
                  },
                },
                id_expiry_date_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
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
                        "related_party.organization_id_type_details"
                      );
                    },
                  },
                },

                issuing_authority_text: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("issuing_authorities");
                      return option;
                    },
                  },
                },

                issuing_authority: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("issuing_authorities");
                      return option;
                    },
                  },
                },
                issued_district: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("districts");
                      return option;
                    },
                  },
                },
                issued_district_text: {
                  "ui:widget": "CascadeDropdown",
                  "ui:placeholder": "Select Place of Issue",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("countries");
                      return option;
                    },
                  },
                },
                visa_issued_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Visa Issued Date (A.D)",
                  "ui:options": {
                    enforceAgeRestriction: false,
                    minDate: 0,
                    disableFutureDates: true,
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "visa_issued_date",
                        "related_party.organization_id_type_details"
                      );
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
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "visa_expiry_date",
                        "related_party.organization_id_type_details"
                      );
                    },
                  },
                },
                visa_type: {
                  "ui:placeholder": "Select Visa Type",
                },
              },
            },

            is_minor: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:classNames": "d-flex align-items-center",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) => {
                  this.setUiSchema((prevSchema) => ({
                    ...prevSchema,
                    related_party: {
                      ...prevSchema?.related_party,
                      items: {
                        ...prevSchema?.related_party.items,
                        date_of_birth_ad: {
                          ...prevSchema?.related_party.items.date_of_birth_ad,
                          "ui:options": {
                            ...prevSchema?.related_party.items.date_of_birth_ad[
                              "ui:options"
                            ],
                            minAge: value ? 18 : 0,
                            disableFutureDates: value,
                            validAge: !value ? 18 : 0,
                          },
                        },
                        date_of_birth_bs: {
                          ...prevSchema?.related_party.items.date_of_birth_bs,
                          "ui:options": {
                            ...prevSchema?.related_party.items.date_of_birth_bs[
                              "ui:options"
                            ],
                            minAge: value ? 18 : 0,
                            disableFutureDates: value,
                            validAge: !value ? 18 : 0,
                          },
                        },
                      },
                    },
                  }));

                  this.dropdownReset(
                    {
                      is_minor: value,
                      marital_status: value ? "MARRD" : null,
                      date_of_birth_ad: undefined,
                      date_of_birth_bs: undefined,
                      dedup_identification: value
                        ? null
                        : this.formData?.related_party?.[index]?.nationality ===
                          "NP"
                        ? "CTZN"
                        : null,

                      id_type_details: [{}],
                    },
                    "related_party",
                    index ?? 0
                  );
                },
              },
            },
            related_party_designation: {
              "ui:label": false,
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
                  "designation",
                  "customer_designation",
                  "shares",
                  "beneficial_shares",
                  "organization_name",
                ],
                designation: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      // Get already selected designations from current related_party_designation array
                      const newSelectedData = formData?.related_party?.[
                        index[0]
                      ]?.related_party_designation
                        ?.map((designation) => designation?.designation)
                        .filter(Boolean);

                      // Get filtered options from corporate_relation
                      const filterOption = this.filterOptions(
                        "corporate_relation_types"
                      );

                      const currentSelectedValue =
                        formData?.related_party?.[index[0]]
                          ?.related_party_designation?.[index[1]]?.designation;

                      const filterByDesignation = filterOption?.filter(
                        (item) => {
                          // Skip if item or value is null/undefined or empty string
                          if (!item || !item.value || item.value.trim() === "")
                            return false;
                          // Keep the currently selected value even if it's already selected
                          return (
                            item.value === currentSelectedValue ||
                            !newSelectedData?.includes(item.value)
                          );
                        }
                      );

                      return filterByDesignation || [];
                    },
                    onChange: (value, index) => {
                      this.setFormData((prevData) => ({
                        ...prevData,
                        related_party: prevData?.related_party?.map((item, i) =>
                          i === index[0]
                            ? {
                                ...item,
                                related_party_designation:
                                  item?.related_party_designation?.map(
                                    (item, i) =>
                                      i === index[1]
                                        ? {
                                            ...item,
                                            designation: value,
                                            customer_designation: undefined,
                                          }
                                        : item
                                  ),
                              }
                            : item
                        ),
                      }));

                      this.setRenderFormKey((prev) => prev + 1);
                    },
                  },
                },
                customer_designation: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    setDisabled: (formData, index) => {
                      const designation =
                        formData?.related_party?.[index[0]]
                          ?.related_party_designation?.[index[1]]?.designation;
                      return !designation;
                    },
                    getOptions: (formData, index) => {
                      // Check if the current selected designation is Shareholder
                      const isShareholderSelected =
                        formData?.related_party?.[index[0]]
                          ?.related_party_designation?.[0]?.designation !==
                        "ShareHolder"; // Replace with actual Shareholder UUID if needed

                      // Get the designation value of the current related party designation
                      const designationValue =
                        formData?.related_party?.[index[0]]
                          ?.related_party_designation?.[index[1]]
                          ?.designation ||
                        this.formData?.related_party?.[index[0]]
                          ?.related_party_designation?.[index[1]]?.designation;

                      // Get the filter options based on the designation value
                      const filterOption = this.filterOptions(
                        "corporate_relation",
                        designationValue
                      );

                      // Apply filtering based on the 'isShareholderSelected' flag to exclude "Organization"
                      return isShareholderSelected
                        ? filterOption?.filter(
                            (item) => item?.value !== "Organization"
                          ) // Exclude "Organization" value
                        : filterOption;
                    },
                  },
                },
                shares: {
                  "ui:options": {
                    type: "number",
                    maxLength: 3,
                  },
                },
                beneficial_shares: {
                  "ui:options": {
                    type: "number",
                    maxLength: 3,
                  },
                },
                organization_name: {},
              },
            },

            national_id_issuing_authority: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("issuing_authorities");
                  return option;
                },
              },
            },
            guardian_national_id_issuing_authority: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("issuing_authorities");
                  return option;
                },
              },
            },

            customer_type_id: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   getOptions: (formData, index) => {
              //     return formData?.related_party?.[index]
              //       ?.related_party_designation?.[0]?.customer_designation ===
              //       "Organization"
              //       ? this.filterOptions("customer_types")
              //       : this.filterOptionsCustomer(
              //           "customer_type_relation",
              //           formData?.related_party?.[index]?.nationality
              //         );
              //   },
              //   onChange: (value, index) => {
              //     return this.dropdownReset(
              //       {
              //         customer_type_id: value,
              //         constitution_code_id:
              //           this?.formData?.related_party?.[index]?.nationality ===
              //           "NP"
              //             ? "61ab1cad-b71c-4d1e-a8db-edd671e8ad54"
              //             : this?.formData?.related_party?.[index]
              //                 ?.nationality ===
              //               "1d21f625-d93f-11ef-aac3-02420a004606"
              //             ? "2dde7dbd-f361-47cc-a785-110c71eb5554"
              //             : "c3bf67a2-5932-4808-b95f-b21b5a9fb280",
              //       },
              //       "related_party",
              //       index ?? 0
              //     );
              //   },
              // },
            },
            constitution_code_id: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   getOptions: (formData, index) => {
              //     const options = this.functionGroup?.getRequiredDocuments(
              //       this.optionsData["multi_validation_mapping"],
              //       {
              //         nationality:
              //           formData?.related_party?.[index ?? 0]?.nationality,
              //         customer_type_id:
              //           formData?.related_party?.[index ?? 0]?.customer_type_id,
              //       },
              //       "constitution_code_id"
              //     );
              //     return formData?.related_party?.[index]
              //       ?.related_party_designation?.[0]?.customer_designation ===
              //       "Organization"
              //       ? this.filterOptions("constitution_types")
              //       : options;
              //   },
              // },
            },
            mobile_country_code: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("country_codes");
                  return option;
                },
              },
            },
            phone_country_code: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("country_codes");
                  return option;
                },
              },
            },
            guardian_mobile_country_code: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("country_codes");
                  return option;
                },
              },
            },
            guardian_phone_country_code: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("country_codes");
                  return option;
                },
              },
            },
            permanent_country: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
              },
            },
            guardian_permanent_country: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
              },
            },

            marital_status: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("marital_status");
                  return option;
                },
              },
            },
            nationality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  const option = this.filterOptions("nationalities");
                  return option;
                },
                onChange: (value, index) => {
                  this.dropdownResetDefault(
                    {
                      nationality: value,
                      dedup_id_number: "",
                      dedup_identification:
                        value === "NP"
                          ? this.formData?.related_party?.[index]?.is_minor
                            ? null
                            : "CTZN"
                          : value === "1d21f625-d93f-11ef-aac3-02420a004606"
                          ? null
                          : "PP",
                      permanent_country:
                        value === "NP"
                          ? "NP"
                          : this.formData?.permanent_country,
                      currency: null,
                      account_scheme_id: null,
                      customer_type_id: null,
                      constitution_code_id: null,
                      id_type_details:
                        value === "NP" ||
                        value === "1d21f625-d93f-11ef-aac3-02420a004606"
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
                    },
                    "related_party",
                    index
                  );
                  value === "NP" && (this.nationalityChanged = true);
                  return null;
                },
              },
            },

            dedup_corporate_name: {
              "ui:options": {
                setValue: (formData, index) => {
                  this.setFormData((prevFormData) => ({
                    ...prevFormData,
                    related_party: prevFormData?.related_party?.map(
                      (item, idx) =>
                        index === idx
                          ? {
                              ...item,
                              name: item?.dedup_corporate_name,
                              alias: item?.dedup_corporate_name,
                            }
                          : item
                    ),
                  }));
                },
              },
            },
            dedup_corporate_registration_number: {
              "ui:options": {
                setValue: (formData, index) => {
                  this.setFormData((prevFormData) => ({
                    ...prevFormData,
                    related_party: prevFormData?.related_party?.map(
                      (item, idx) =>
                        index === idx
                          ? {
                              ...item,
                              registration_number:
                                item?.dedup_corporate_registration_number,
                            }
                          : item
                    ),
                  }));
                },
              },
            },
            dedup_corporate_pan_number: {
              "ui:options": {
                maxLength: 9,
                setValue: (formData, index) => {
                  this.setFormData((prevFormData) => ({
                    ...prevFormData,
                    related_party: prevFormData?.related_party?.map(
                      (item, idx) =>
                        index === idx
                          ? {
                              ...item,
                              pan_number: item?.dedup_corporate_pan_number,
                            }
                          : item
                    ),
                  }));
                },
              },
            },

            dedup_corporate_check: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
              "ui:label": false,
              "ui:classNames":
                "d-flex justify-content-end align-items-end h-100 my-1",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[
                    index
                  ]?.dedup_corporate_name?.trim() &&
                  !formData?.related_party?.[
                    index
                  ]?.dedup_corporate_registration_number?.trim(),
                onClick: (index) => {
                  this.getDedupCorporateCheck(index ?? 0);
                },
              },
            },

            dedup_corporate_module_data: {
              "ui:widget": this.form_status?.includes("review")
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
                    dedup_corporate_module_data: tableData,
                  }));
                },
                actionHandlers: {
                  view: (record) => setIsModalVisible(true),
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
                      return this.fetchRelatedPartyEnquiry(
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
                },
              },
            },

            dedup_check: {
              "ui:widget": this.form_status?.includes("init")
                ? "ButtonField"
                : "hidden",
              "ui:label": false,
              "ui:classNames":
                "d-flex justify-content-end align-items-end h-100 my-1",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[index]?.first_name?.trim(),
                onClick: (index) => {
                  this.getDedupCheck(index ?? 0);
                },
              },
            },
            dedup_module_data: {
              "ui:widget": this.form_status?.includes("review")
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
                      return this.fetchRelatedPartyEnquiry(
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
                mobile_country_code: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("country_codes");
                      return option;
                    },
                  },
                },
                phone_country_code: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("country_codes");
                      return option;
                    },
                  },
                },
                mobile_number: {
                  "ui:options": {
                    maxLength: 12,
                  },
                },
                phone_number: {
                  "ui:options": {
                    maxLength: 12,
                  },
                },
                area_code: {
                  "ui:options": {
                    maxLength: 3,
                  },
                },
              },
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
                        const filteredData = Object.keys(
                          prev?.related_party?.[index]
                        )
                          .filter((key) => key.includes("guardian_"))
                          .reduce((acc, key) => {
                            acc[key] = prev[key];
                            return acc;
                          }, {});

                        return {
                          ...prev,
                          related_party: prev?.related_party?.map(
                            (item, idx) =>
                              idx === index && {
                                account_info: item?.account_info,
                                related_party_designation:
                                  item?.related_party_designation,
                                is_minor: item?.is_minor,
                              }
                          ),
                        };
                      }),
                    100
                  ),
              },
            },
            literacy: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  return this.filterOptions("literacy");
                },
                onChange: (value) => {
                  this.dropdownReset({
                    literacy: value,
                    educational_qualification:
                      value !== "004"
                        ? "078e94e8-dfb7-4e28-948b-3a75a55a0458"
                        : null,
                  });
                },
              },
            },
            guardian_literacy: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  return this.filterOptions("literacy");
                },
                onChange: (value) => {
                  this.dropdownReset({
                    literacy: value,
                    educational_qualification: null,
                  });
                },
              },
            },
            educational_qualification: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  return this.filterOptions("education_qualifications");
                },
              },
            },
            guardian_educational_qualification: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) => {
                  return this.filterOptions("education_qualifications");
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
                  this.calculateRiskDynamic(index ?? 0);
                },
              },
            },
            organization_type: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData) =>
                  this.filterOptions(
                    "legal_entities",
                    this.formData?.account_info || formData?.account_info
                  ),
                value:
                  this.formData.legal_entity_type || formData.legal_entity_type,
              },
            },
            connectedPairs: [
              ["last_name", "last_name_not_available"],
              ["email", "email_not_available"],
              ["guardian_last_name", "guardian_last_name_not_available"],
              ["guardian_email", "guardian_email_not_available"],
            ],
            business_type_id: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("business_type");
                  return option;
                },
                onChange: (events, index) => {
                  this.setFormData((prevFormData) => ({
                    ...prevFormData,
                    related_party: prevFormData?.related_party?.map(
                      (item, idx) =>
                        index === idx || index[0] === idx
                          ? {
                              ...item,
                              business_type_id: events,
                              type_of_transaction: events,
                            }
                          : item
                    ),
                  }));
                },
              },
            },
            insurance_type: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = [
                    {
                      label: "Non Life Insurance",
                      value: "Non Life Insurance",
                    },
                    {
                      label: "Life Insurance",
                      value: "Life Insurance",
                    },
                  ];
                  return option;
                },
                onChange: (events, index) => {
                  this.setFormData((prevFormData) => ({
                    ...prevFormData,
                    related_party: prevFormData?.related_party?.map(
                      (item, idx) =>
                        index === idx || index[0] === idx
                          ? {
                              ...item,
                              insurance_type: events,
                              tax_percentage:
                                events === "Life Insurance" ? "5%" : "15%",
                            }
                          : item
                    ),
                  }));
                },
              },
            },
            account_purpose: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("account_purposes");
                  return option;
                },
              },
            },
            type_of_transaction: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("business_type");
                  return option;
                },
              },
            },
            // registration_district: {
            //   "ui:widget": "CascadeDropdown",
            //   "ui:options": {
            //     getOptions: () => {
            //       const option = this.filterOptions("districts");
            //       return option;
            //     },
            //   },
            // },
            country_of_incorporation: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
                onChange: (events, index) => {
                  this.setFormData((prevFormData) => ({
                    ...prevFormData,
                    related_party: prevFormData?.related_party?.map(
                      (item, idx) =>
                        index === idx || index[0] === idx
                          ? {
                              ...item,
                              country_of_incorporation: events,
                              jurisdiction_country: events,
                              registration_place_country: events,
                            }
                          : item
                    ),
                  }));
                },
              },
            },

            jurisdiction: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("jurisdiction");
                  return option;
                },
              },
            },
            jurisdiction_country: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
              },
            },

            registration_place: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("districts");
                  return option;
                },
              },
            },

            registration_place_country: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
              },
            },

            pan_issuing_authority: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("issuing_authorities");
                  return option;
                },
              },
            },
            guardian_pan_issuing_authority: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("issuing_authorities");
                  return option;
                },
              },
            },
            registration_country: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
              },
            },
            existing_risk_rating: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("risk_categories");
                  return option;
                },
              },
            },
            guardian_existing_risk_rating: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("risk_categories");
                  return option;
                },
              },
            },

            relation_with_account_holder: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) =>
                  this.filterOptions(
                    "relationships",
                    formData?.related_party &&
                      formData?.related_party?.[index ?? 0]
                        ?.family_account_holder
                  ),
              },
            },
            dedup_identification: {
              // "ui:widget": "CascadeDropdown",
              "ui:options": {
                setDisabled: (formData, index) =>
                  formData?.related_party?.[index]?.is_minor
                    ? !(
                        formData?.related_party?.[index]?.nationality ===
                          "NP" ||
                        formData?.related_party?.[index]?.nationality ===
                          "1d21f625-d93f-11ef-aac3-02420a004606"
                      )
                    : formData?.related_party?.[index]?.nationality !==
                      "1d21f625-d93f-11ef-aac3-02420a004606",
                // getOptions: (formData, index) => {
                //   if (
                //     formData?.related_party?.[index]?.dedup_identification &&
                //     this.nationalityChanged === true
                //   ) {
                //     this.convertToArray(
                //       formData?.related_party?.[index]?.dedup_identification,
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
                //         formData?.related_party?.[index]?.nationality,
                //       account_type: formData?.related_party?.[index]?.is_minor
                //         ? "MINOR"
                //         : "INDIVIDUAL",
                //     }
                //   );
                //   return d;
                // },

                onChange: (value, index) => {
                  this.dropdownReset({
                    dedup_identification: value,
                    dedup_id_number: "",
                  });
                  this.convertToArray(
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
                  "ui:disabled": this.form_status.includes("init")
                    ? false
                    : true,
                  "ui:options": {
                    setDisabled: (formData, index) =>
                      this.form_status.includes("init") ||
                      this.form_status.includes("update")
                        ? formData?.related_party?.[index[0]]
                            ?.family_information?.[index[1]]
                            ?.is_family_name_not_available ??
                          (formData?.related_party?.[index[0]]
                            ?.family_information?.[index[1]]
                            ?.family_member_relation === "FATHE" &&
                          formData?.related_party?.[index[0]]?.father_name
                            ? true
                            : false)
                        : true,
                  },
                },

                is_family_name_not_available: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:disabled": this.form_status.includes("init")
                    ? false
                    : true,
                  "ui:options": {
                    setDisabled: (formData, index) => {
                      return formData?.related_party?.[index?.[0]]
                        ?.family_information?.[index?.[1]]
                        ?.family_member_relation === "FATHE" &&
                        formData?.related_party?.[index?.[0]]?.father_name
                        ? true
                        : false;
                    },
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
                preserveValue: true,
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
                preserveValue: true,
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
                  "issuing_authority",
                  "issued_district_text",
                  "issuing_authority_text",
                  "id_issued_date_ad",
                  "id_issued_date_bs",
                  "id_expiry_date_ad",
                  "id_expiry_date_bs",
                  "visa_issued_date_ad",
                  "visa_expiry_date_ad",
                  "visa_type",
                  "national_id_number",
                  "nrn_card_number",
                  "comment",
                  "disable",
                  "removable",
                ],
                disable: {
                  "ui:widget": "hidden",
                },
                removable: {
                  "ui:widget": "hidden",
                },
                // id_type_id: {
                //   "ui:widget": "CascadeDropdown",
                //   "ui:options": {
                //     getOptions: (formData, index) => {
                //       const filterOption =
                //         this.functionGroup?.getRequiredDocuments(
                //           this.optionsData["multi_validation_mapping"],
                //           {
                //             nationality:
                //               this.formData?.related_party?.[index[0]]
                //                 ?.nationality,
                //             account_type: this.formData?.account_info,
                //           }
                //         );

                //       return filterOption;
                //     },
                //   },
                // },
                // issue_country: {
                //   "ui:widget": "CascadeDropdown",
                //   "ui:options": {
                //     getOptions: () => {
                //       const option = this.filterOptions("countries");
                //       return option;
                //     },
                //     setDisabled: (formData, index) =>
                //       this.formData?.related_party?.[index]?.nationality ===
                //       "NP",
                //   },
                // },

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
                  //                   (item, idx) => ({
                  //                     ...item,
                  //                     ...(item?.id_type_id && {
                  //                       issue_country:
                  //                         relatedParty?.nationality === "NP" // Nepalese
                  //                           ? "NP" // Nepal
                  //                           : relatedParty?.nationality ===
                  //                             "fc427fcf-290d-4ef1-8048-1af42ba3f02c" // Chinese
                  //                           ? "4aa6e08f-fd9e-415c-a993-5ff4a2483755" // China
                  //                           : relatedParty?.nationality ===
                  //                             "47ea7bb9-7fa8-4441-a1fc-0f8b79812268" // American
                  //                           ? "7380459a-6b3e-49c9-8c62-96e5bfcb3876" // USA
                  //                           : relatedParty?.nationality ===
                  //                             "2d9acde3-9152-4446-a7c3-e672c72e5481" // Australian
                  //                           ? "cdbb05bf-7db0-4a00-9607-cfdff798457b" // Australia
                  //                           : relatedParty?.nationality ===
                  //                             "bec5d07d-42fe-4fcf-a945-51b23465f31a" // Korean
                  //                           ? "67031d29-848c-4386-aa40-82e0fc5b62f3" // Republic
                  //                           : relatedParty?.nationality ===
                  //                             "1d21f625-d93f-11ef-aac3-02420a004606"
                  //                           ? "636a6628-2b78-4e21-97a6-b276b2f9efb3"
                  //                           : item?.issue_country ?? null,
                  //                     }),
                  //                   })
                  //                 ),
                  //               // id_type_details:
                  //               //   relatedParty?.id_type_details?.map((item) =>
                  //               //     item?.id_type_id
                  //               //       ? {
                  //               //           ...item,
                  //               //           disable: true,
                  //               //           ...(item?.id_type_id && {
                  //               //             issue_country:
                  //               //               relatedParty?.nationality ===
                  //               //               "NP"
                  //               //                 ? "NP"
                  //               //                 : relatedParty?.nationality ===
                  //               //                   "1d21f625-d93f-11ef-aac3-02420a004606"
                  //               //                 ? "636a6628-2b78-4e21-97a6-b276b2f9efb3"
                  //               //                 : item?.issue_country ?? null,
                  //               //           }),
                  //               //         }
                  //               //       : {
                  //               //           ...item,
                  //               //           ...(item?.id_type_id && {
                  //               //             issue_country:
                  //               //               relatedParty?.nationality ===
                  //               //               "NP"
                  //               //                 ? "NP"
                  //               //                 : relatedParty?.nationality ===
                  //               //                   "1d21f625-d93f-11ef-aac3-02420a004606"
                  //               //                 ? "636a6628-2b78-4e21-97a6-b276b2f9efb3"
                  //               //                 : item?.issue_country ?? null,
                  //               //           }),
                  //               //         }
                  //               //   ),
                  //             })
                  //           ),
                  //         })),
                  //       100
                  //     );
                  //     const filterOption =
                  //       this.functionGroup?.getRequiredDocuments(
                  //         this.optionsData["multi_validation_mapping"],
                  //         {
                  //           nationality:
                  //             formData?.related_party?.[index[0]]?.nationality,
                  //           account_type: this.formData?.related_party?.[
                  //             index[0]
                  //           ]?.is_minor
                  //             ? "MINOR"
                  //             : "INDIVIDUAL",
                  //         }
                  //       );
                  //     return filterOption;
                  //   },
                  // },
                },

                issue_country: {
                  // "ui:options": {
                  //   setDisabled: (formData, index) => {
                  //     return (
                  //       formData?.related_party?.[index?.[0]]?.nationality ===
                  //         "NP" || // Nepal
                  //       formData?.related_party?.[index?.[0]]?.nationality ===
                  //         "1d21f625-d93f-11ef-aac3-02420a004606" || // India
                  //       formData?.related_party?.[index?.[0]]?.nationality ===
                  //         "fc427fcf-290d-4ef1-8048-1af42ba3f02c" || // China
                  //       formData?.related_party?.[index?.[0]]?.nationality ===
                  //         "47ea7bb9-7fa8-4441-a1fc-0f8b79812268" || // US
                  //       formData?.related_party?.[index?.[0]]?.nationality ===
                  //         "2d9acde3-9152-4446-a7c3-e672c72e5481" || // Australian
                  //       formData?.related_party?.[index?.[0]]?.nationality ===
                  //         "bec5d07d-42fe-4fcf-a945-51b23465f31a" // Republic
                  //     );
                  //   },
                  // },
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
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.related_party?.[
                        index?.[0]
                      ]?.id_type_details?.map((item) =>
                        this.moment(
                          formData?.related_party?.[index?.[0]]
                            ?.date_of_birth_ad
                        )
                          .add(
                            formData?.related_party?.[index?.[0]]?.is_minor
                              ? 1
                              : 16,
                            formData?.related_party?.[index?.[0]]?.is_minor
                              ? "day"
                              : "years"
                          )
                          .format("YYYY-MM-DD")
                      );
                      return minDateValue && minDateValue?.[0];
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
                  "ui:options": {
                    enforceAgeRestriction: true,
                    name: "id_issued_date_bs",
                    disableFutureDates: true,
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.related_party?.[
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
                      return minDateValue && minDateValue?.[0];
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
                  "ui:placeholder": "Select Expiry Date (A.D)",
                  "ui:options": {
                    name: "id_expiry_date_ad",
                    enforceAgeRestriction: false,
                    validAge: 0,
                    enableFutureDates: true,
                    setValue: (formData, index) => {
                      const match = formData?.related_party?.[
                        index?.[0]
                      ]?.id_type_details?.find(
                        (item, dataIndex) =>
                          dataIndex === index[1] &&
                          [
                            "BRTCT",
                            "bf99155d-a772-4b30-b646-b0806179499f",
                          ].includes(item?.id_type_id)
                      );

                      if (
                        match &&
                        formData?.related_party?.[index[0]]?.date_of_birth_ad
                      ) {
                        let extended_date = new Date(
                          formData?.related_party?.[index[0]]?.date_of_birth_ad
                        );
                        extended_date.setFullYear(
                          extended_date.getFullYear() + 16
                        );
                        setFormData((prev) => ({
                          ...prev,
                          related_party: prev?.related_party?.map((item, idx) =>
                            idx === index[0]
                              ? {
                                  ...item,
                                  id_type_details: item?.id_type_details?.map(
                                    (item) =>
                                      [
                                        "BRTCT",
                                        "bf99155d-a772-4b30-b646-b0806179499f",
                                      ].includes(item?.id_type_id)
                                        ? {
                                            ...item,
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
                                        : item
                                  ),
                                }
                              : item
                          ),
                        }));
                      }
                    },
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

                issuing_authority_text: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("issuing_authorities");
                      return option;
                    },
                  },
                },

                // issuing_authority: {
                //   "ui:widget": "CascadeDropdown",
                //   "ui:options": {
                //     getOptions: () => {
                //       const option = this.filterOptions("issuing_authorities");
                //       return option;
                //     },
                //     setValue: (formData, index) => {
                //       const document_types = {
                //         citizenship_number:
                //           "CTZN",
                //         passport: "PP",
                //         driving_license: "LCNSE",
                //         voter_id: "VOTER",
                //         nid: "ce66bc73-158b-42e5-b445-095c193d0137",
                //       };
                //       const issuing_authorities = {
                //         citizenship_number:
                //           "DAO",
                //         passport: "DAO",
                //         driving_license: "NA",
                //         voter_id: "a4e3fa6d-133d-40da-8996-444207b7f2a2",
                //         nid: "DONICR",
                //       };

                //       const currentIdType =
                //         formData?.related_party?.[index[0]]?.id_type_details?.[
                //           index[1]
                //         ]?.id_type_id;

                //       const matchingDocType = Object.entries(
                //         document_types
                //       ).find(([_, value]) => value === currentIdType);

                //       if (matchingDocType) {
                //         const [docTypeKey] = matchingDocType;
                //         setTimeout(() => {
                //           setFormData((prev) => ({
                //             ...prev,
                //             related_party: prev?.related_party?.map(
                //               (item, idx) =>
                //                 idx === index[0]
                //                   ? {
                //                       ...item,
                //                       issuing_authority:
                //                         issuing_authorities[docTypeKey],
                //                     }
                //                   : item
                //             ),
                //           }));
                //         }, 100);

                //         return issuing_authorities[docTypeKey];
                //       }

                //       return null;
                //     },
                //   },
                // },
                issued_district: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      const identification =
                        formData?.related_party?.[index[0]]?.id_type_details?.[
                          index[1]
                        ]?.id_type_id;
                      return this.filterOptions(
                        identification === "PP" ||
                          identification ===
                            "4fcd4a69-59f3-4de2-986f-c56e07d223cd"
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
                        formData?.related_party?.[index[0]]?.id_type_details?.[
                          index[1]
                        ]?.id_type_id;
                      return this.filterOptions(
                        identification === "PP" ||
                          identification ===
                            "4fcd4a69-59f3-4de2-986f-c56e07d223cd"
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
                    minDate: 0,
                    disableFutureDates: true,
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "visa_issued_date",
                        "related_party.id_type_details"
                      );
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
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "visa_expiry_date",
                        "related_party.id_type_details"
                      );
                    },
                  },
                },
                visa_type: {
                  "ui:placeholder": "Select Visa Type",
                },
              },
            },
            same_as_permanent: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) =>
                  sameAsPermanentOnChange(value, index),
                preserveValue: true,
              },
            },

            current_country: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
              },
            },

            current_province: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions("provinces");
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      current_province: value,
                      current_district: "",
                      current_municipality: "",
                      current_ward_number: "",
                      current_street_name: "",
                      current_town: "",
                      current_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            current_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "districts",
                    formData.related_party &&
                      formData.related_party?.[index]?.current_province
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      current_district: value,
                      current_municipality: "",
                      current_ward_number: "",
                      current_street_name: "",
                      current_town: "",
                      current_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            current_municipality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "local_bodies",
                    formData.related_party &&
                      formData.related_party?.[index]?.current_district
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      current_municipality: value,
                      current_ward_number: "",
                      current_street_name: "",
                      current_town: "",
                      current_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },
            salutation: {
              "ui:widget": "CustomRadioWidget",
              // "ui:label": false,
              "ui:options": {
                // getOptions: (formData, index) => {
                //   return this.filterOptions(
                //     "salutations",
                //     this.formData?.related_party?.[index]?.is_minor
                //       ? "MINOR"
                //       : this.formData?.account_info
                //   );
                // },
                onChange: (value, index) => {
                  this.dropdownReset(
                    {
                      salutation: value,
                      gender: null,
                    },
                    "related_party",
                    index ?? 0
                  );
                },
              },
            },

            cif_enquiry: {
              "ui:widget": this.form_status?.includes("review")
                ? "hidden"
                : "ButtonField",
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
                                has_cif: item?.has_cif,
                                cif_number: item?.cif_number,
                                account_info: item?.account_info,
                                related_party_designation:
                                  item?.related_party_designation,
                                is_minor: item?.is_minor,
                                // ...item?.is_minor && Object.keys(item)
                                //   .filter((key) => key.includes("guardian_"))
                                //   .reduce((acc, key) => {
                                //     acc[key] = prev[key];
                                //     return acc;
                                //   }, {})
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
              showCheckbox: this.form_status?.includes("init") ? true : false,
              fixedActionsColumn: true,
              showFooter: true,
              "ui:options": {
                showActionText: true,
                onCheckboxChange: (tableData, category, checked, index) =>
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
                  })),

                actionHandlers: {
                  view: (record) => setIsModalVisible(true),
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
                      permanent_district: "",
                      permanent_municipality: "",
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
                    formData.related_party &&
                      formData.related_party?.[index]?.permanent_province
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      permanent_district: value,
                      permanent_municipality: "",
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
                    formData.related_party &&
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
                      source_of_income: "",
                    },
                    "related_party",
                    index
                  ),
              },
            },

            guardian_occupation_type: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => this.filterOptions("occupations"),
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      guardian_occupation_type: value,
                      guardian_source_of_income: "",
                    },
                    "related_party",
                    index ?? 0
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
                    getOptions: () => {
                      const option = this.filterOptions("relationships");
                      return option;
                    },
                  },
                },
                business_type: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("business_type");
                      return option;
                    },
                  },
                },
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

            // organization object
            name: {
              "ui:options": {
                setDisabled: (formData, index) => {
                  const disable =
                    this.formData?.related_party?.[index]?.dedup_corporate_name;
                  return disable;
                },
                setValue: (formData, index) => {
                  this.setFormData((prevFormData) => ({
                    ...prevFormData,
                    related_party: prevFormData?.related_party?.map(
                      (item, idx) =>
                        index === idx
                          ? {
                              ...item,
                              alias: item?.name,
                            }
                          : item
                    ),
                  }));
                },
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
            screening: {
              "ui:widget": "hidden",
              "ui:label": false,
              "ui:options": {
                disableButton: (formData, index) => {
                  return !formData?.related_party?.[index]?.name?.trim();
                },
                onClick: (index) => {
                  this.fetchOrganizationRelatedPartyInfoScreening(index ?? 0);
                },
              },
            },

            screening_card: {
              "ui:widget": "ScreeningReportCard",
              "ui:label": false,
              showCheckbox: this.form_status?.includes("init") ? true : false,
              fixedActionsColumn: true,
              showFooter: true,
              "ui:options": {
                showActionText: true,
                onCheckboxChange: (tableData, category, checked, index) =>
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
                            screening_card: tableData,
                          }
                        : item
                    ),
                  })),
                actionHandlers: {
                  view: (record) => setIsModalVisible(true),
                },
              },
            },
            registration_authority: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("issuing_authorities");
                  return option;
                },
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
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "registration_date_ad",
                    "related_party",
                    index ? index : 0
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
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    false,
                    "registration_date_bs",
                    "related_party",
                    index ? index : 0
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
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "registration_expiry_date_ad",
                    "related_party",
                    index ? index : 0
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
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    false,
                    "registration_expiry_date_bs",
                    "related_party",
                    index ? index : 0
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
            has_license: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
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
                connectedPairs: [
                  ["license_expiry_date_ad", "has_no_expiry_date"],
                ],
                has_license: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:label": false,
                },
                license_issuing_authority: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("issuing_authorities");
                      return option;
                    },
                  },
                },
                license_issuing_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Issued Date (A.D)",
                  "ui:options": {
                    enforceAgeRestriction: false,
                    minDate: 0,
                    disableFutureDates: true,
                    name: "license_issuing_date_ad",
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "license_issuing_date",
                        "related_party.license_details"
                      );
                    },
                  },
                },
                license_issuing_date_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
                  "ui:placeholder": "Select Issued Date (B.S)",
                  "ui:options": {
                    enforceAgeRestriction: false,
                    minDate: 0,
                    disableFutureDates: true,
                    name: "license_issuing_date_bs",
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "license_issuing_date",
                        "related_party.license_details"
                      );
                    },
                  },
                },
                has_no_expiry_date: {
                  "ui:widget": "CustomCheckBoxWidget",
                  "ui:label": false,
                  onChange: (formData, index) => {},
                },
                license_expiry_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:options": {
                    enforceAgeRestriction: false,
                    minDate: 0,
                    enableFutureDates: true,
                    name: "license_expiry_date_ad",
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "license_expiry_date",
                        "related_party.license_details"
                      );
                    },
                  },
                },
                license_expiry_date_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
                  "ui:options": {
                    enforceAgeRestriction: false,
                    minDate: 0,
                    enableFutureDates: true,
                    name: "license_expiry_date_bs",
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "license_expiry_date",
                        "related_party.license_details"
                      );
                    },
                  },
                },
              },
            },
            pan_number: {
              "ui:options": {
                maxLength: 9,
                setValue: (events, index) => {
                  setTimeout(() => {
                    this.setFormData((prevFormData) => ({
                      ...prevFormData,
                      related_party: prevFormData?.related_party?.map(
                        (item, idx) =>
                          index === idx
                            ? {
                                ...item,
                                dedup_corporate_pan_number: item?.pan_number,
                              }
                            : item
                      ),
                    }));
                  }, 600);
                },
              },
            },
            pan_issue_place: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("districts");
                  return option;
                },
              },
            },
            guardian_pan_issue_place: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("districts");
                  return option;
                },
              },
            },
            national_id_issue_place: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("districts");
                  return option;
                },
              },
            },
            guardian_national_id_issue_place: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("districts");
                  return option;
                },
              },
            },
            pan_issue_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:options": {
                name: "pan_issue_date_ad",
                enforceAgeRestriction: false,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  const minDateValue = this.moment(
                    formData?.related_party?.[index]?.nationality
                      ? formData?.related_party?.[index]?.date_of_birth_ad
                      : formData?.related_party?.[index]?.registration_date_ad
                  )
                    .add(1, "day")
                    .format("YYYY-MM-DD");
                  return minDateValue;
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "pan_issue_date_ad",
                    "related_party",
                    index ? index : 0
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
                minimumDate: (formData, index) => {
                  const minDateValue = this.moment(
                    formData?.related_party?.[index]?.nationality
                      ? formData?.related_party?.[index]?.date_of_birth_ad
                      : formData?.related_party?.[index]?.registration_date_ad
                  ).format("YYYY-MM-DD");
                  return minDateValue;
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    false,
                    "pan_issue_date_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },

            guardian_pan_issue_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:options": {
                name: "guardian_pan_issue_date_ad",
                enforceAgeRestriction: false,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  const minDateValue = this.moment(
                    formData?.related_party?.[index]?.guardian_date_of_birth_ad
                  )
                    .add(1, "day")
                    .format("YYYY-MM-DD");
                  return minDateValue;
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "guardian_pan_issue_date_ad",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },
            guardian_pan_issue_date_bs: {
              "ui:widget": "NepaliDatePickerR",
              "ui:options": {
                enforceAgeRestriction: true,
                name: "guardian_pan_issue_date_bs",
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  const minDateValue = this.moment(
                    formData?.related_party?.[index]?.guardian_date_of_birth_bs
                  ).format("YYYY-MM-DD");
                  return minDateValue;
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    false,
                    "guardian_pan_issue_date_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },

            national_id_issue_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:options": {
                name: "national_id_issue_date_ad",
                enforceAgeRestriction: false,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  const minDateValue = this.moment(
                    formData?.related_party?.[index]?.date_of_birth_ad
                  )
                    .add(1, "day")
                    .format("YYYY-MM-DD");
                  return minDateValue;
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
              "ui:widget": "NepaliDatePickerR",
              "ui:options": {
                enforceAgeRestriction: true,
                name: "national_id_issue_date_bs",
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  const minDateValue = this.moment(
                    formData?.related_party?.[index]?.registration_date_ad
                  ).format("YYYY-MM-DD");
                  return minDateValue;
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

            guardian_national_id_issue_date_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:options": {
                name: "guardian_national_id_issue_date_ad",
                enforceAgeRestriction: false,
                validAge: 0,
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  const minDateValue = this.moment(
                    formData?.related_party?.[index]?.guardian_date_of_birth_ad
                  )
                    .add(1, "day")
                    .format("YYYY-MM-DD");
                  return minDateValue;
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "guardian_national_id_issue_date_ad",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },
            guardian_national_id_issue_date_bs: {
              "ui:widget": "NepaliDatePickerR",
              "ui:options": {
                enforceAgeRestriction: true,
                name: "guardian_national_id_issue_date_bs",
                disableFutureDates: true,
                minimumDate: (formData, index) => {
                  const minDateValue = this.moment(
                    formData?.related_party?.[index]?.registration_date_ad
                  ).format("YYYY-MM-DD");
                  return minDateValue;
                },
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    false,
                    "guardian_national_id_issue_date_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },

            registration_province: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("provinces");
                  return option;
                },

                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      registration_province: value,
                      registration_district: undefined,
                      registration_municipality: undefined,
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },
            registration_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "districts",
                    formData.related_party &&
                      formData.related_party?.[index]?.registration_province
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
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "local_bodies",
                    formData.related_party &&
                      formData.related_party?.[index]?.registration_district
                  );
                },
              },
            },

            same_as_registered_address: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
              "ui:options": {
                setDisabled: (formData, index) => {
                  const disable =
                    !this.formData?.related_party?.[
                      index
                    ]?.registration_country?.includes("NP");
                  return disable;
                },
                onChange: (value, index) =>
                  sameAsRegisteredAddressChange(value, index),
                preserveValue: true,
              },
            },
            mailing_country: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
              },
            },
            mailing_province: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("provinces");
                  return option;
                },
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      mailing_province: value,
                      mailing_district: undefined,
                      mailing_municipality: undefined,
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },
            mailing_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "districts",
                    formData.related_party &&
                      formData.related_party?.[index]?.mailing_province
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
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "local_bodies",
                    formData.related_party &&
                      formData.related_party?.[index]?.mailing_district
                  );
                },
              },
            },
            mailing_ward_number: {
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
              },
            },
            mailing_street: {
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
              },
            },
            mailing_street_name: {
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
              },
            },
            mailing_town: {
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
              },
            },
            mailing_house_number: {
              "ui:options": {
                setDisabled: (formData, index) =>
                  this.formData?.related_party?.[index]
                    ?.same_as_registered_address,
              },
            },

            mobile_number: {
              "ui:options": {
                maxLength: 12,
              },
            },
            phone_number: {
              "ui:options": {
                maxLength: 12,
              },
            },
            area_code: {
              "ui:options": {
                maxLength: 3,
              },
            },

            // Guardian

            guardian_has_cif: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
            },

            guardian_cif_enquiry: {
              "ui:widget": this.form_status?.includes("review")
                ? "hidden"
                : "ButtonField",
              "ui:label": false,
              "ui:classNames": "d-flex h-100 mt-5 align-items-center",
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[
                    index
                  ]?.guardian_cif_number?.trim(),
                onClick: (index) => {
                  this.fetchGuardianCifEnquiry(index, null);
                },
              },
            },
            guardian_customer_type_id: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   getOptions: (formData, index) => {
              //     return this.filterOptionsCustomer(
              //       "customer_type_relation",
              //       this.formData?.related_party?.[index]?.guardian_nationality
              //     );
              //   },
              //   onChange: (value, index) => {
              //     this.dropdownReset(
              //       {
              //         guardian_customer_type_id: value,
              //         guardian_constitution_code_id:
              //           this?.formData?.related_party?.[index]
              //             ?.guardian_nationality === "NP"
              //             ? "61ab1cad-b71c-4d1e-a8db-edd671e8ad54"
              //             : this?.formData?.related_party?.[index]
              //                 ?.guardian_nationality ===
              //               "1d21f625-d93f-11ef-aac3-02420a004606"
              //             ? "2dde7dbd-f361-47cc-a785-110c71eb5554"
              //             : "c3bf67a2-5932-4808-b95f-b21b5a9fb280",
              //       },
              //       "related_party",
              //       index ?? 0
              //     );
              //     return null;
              //   },
              // },
            },

            guardian_constitution_code_id: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   getOptions: (formData, index) => {
              //     const d = this.functionGroup?.getRequiredDocuments(
              //       this.optionsData["multi_validation_mapping"],
              //       {
              //         nationality:
              //           formData?.related_party?.[index]?.guardian_nationality,
              //         customer_type_id:
              //           this.formData?.related_party?.[index]
              //             ?.guardian_customer_type_id ??
              //           formData?.related_party?.[index]
              //             ?.guardian_customer_type_id,
              //       },
              //       "constitution_code_id"
              //     );
              //     return d;
              //   },
              // },
            },

            guardian_dedup_identification: {
              // "ui:widget": "CascadeDropdown",
              "ui:options": {
                // getOptions: (formData, index) => {
                //   if (
                //     formData?.related_party?.[index]
                //       ?.guardian_dedup_identification &&
                //     this.nationalityChanged === true
                //   ) {
                //     this.convertToArray(
                //       formData?.related_party?.[index]
                //         ?.guardian_dedup_identification,
                //       "id_type_id",
                //       "guardian_id_type_details",
                //       ["guardian_dedup_identification", "id_type_id"],
                //       index ?? 0,
                //       "related_party"
                //     );

                //     this.nationalityChanged = false;
                //   }
                //   const d = this.functionGroup?.getRequiredDocuments(
                //     this.optionsData["multi_validation_mapping"],
                //     {
                //       nationality:
                //         formData?.related_party?.[index]
                //           ?.guardian_nationality ??
                //         this.formData?.related_party?.[index]
                //           ?.guardian_nationality,
                //       account_type:
                //         formData?.related_party?.[index]
                //           ?.guardian_nationality ===
                //         "1d21f625-d93f-11ef-aac3-02420a004606"
                //           ? "INDIVIDUAL"
                //           : undefined,
                //     }
                //   );

                //   return d;
                // },
                onChange: (value, index) => {
                  this.convertToArray(
                    value,
                    "id_type_id",
                    "guardian_id_type_details",
                    ["guardian_dedup_identification", "id_type_id"],
                    index ?? 0,
                    "related_party"
                  );
                },
              },
            },

            guardian_dedup_id_number: {
              "ui:options": {
                onChange: (value, index) => {
                  this.convertToArray(
                    value,
                    "identification_number",
                    "guardian_id_type_details",
                    ["guardian_dedup_identification", "id_type_id"],
                    index ?? 0,
                    "related_party"
                  );
                },
              },
            },
            guardian_father_name: {
              "ui:options": {
                onChange: (value, index) => {
                  this.convertToArray(
                    value,
                    "guardian_family_member_full_name",
                    "guardian_family_information",
                    null,
                    index ?? 0,
                    "related_party"
                  );
                },
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
                disableButton: (formData, index) =>
                  !(
                    formData?.related_party?.[
                      index
                    ]?.guardian_first_name?.trim() &&
                    formData?.related_party?.[
                      index
                    ]?.guardian_last_name?.trim() &&
                    formData?.related_party?.[
                      index
                    ]?.guardian_father_name?.trim() &&
                    formData?.related_party?.[
                      index
                    ]?.guardian_dedup_id_number?.trim() &&
                    formData?.related_party?.[
                      index
                    ]?.guardian_date_of_birth_ad?.trim() &&
                    formData?.related_party?.[
                      index
                    ]?.guardian_date_of_birth_bs?.trim()
                  ),
                onClick: (index) => {
                  this.getGuardianDedupCheck(index ?? 0);
                },
              },
            },

            guardian_nationality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  const option = this.filterOptions("nationalities");
                  return option;
                },
                onChange: async (value, index) => {
                  this.dropdownReset(
                    {
                      guardian_nationality: value,
                      guardian_dedup_identification:
                        value === "NP" ? "CTZN" : null,
                      guardian_permanent_country:
                        value === "NP"
                          ? "NP"
                          : this.formData?.related_party?.[index]
                              ?.guardian_permanent_country,
                      guardian_customer_type_id: null,
                      guardian_constitution_code_id: null,
                      guardian_id_type_details: [{}],
                    },
                    "related_party",
                    index ?? 0
                  );

                  // (await value) === "NP" &&
                  //   (this.nationalityChanged = true);
                  return null;
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
                actionHandlers: {
                  view: (record) => setIsModalVisible(true),
                  match: (record, index) => {
                    if (record?.cif_number !== "-") {
                      this.setFormData((prev) => ({
                        ...prev,
                        related_party: prev?.related_party?.map((item, idx) =>
                          idx === index
                            ? {
                                ...item,
                                guardian_has_cif: true,
                                guardian_cif_number: record?.cif_number,
                              }
                            : item
                        ),
                      }));
                      return this.fetchGuardianCifEnquiry(
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
                },
              },
            },

            guardian_related_party_relation_with_account_holder: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   getOptions: (formData, index) => {
              //     return this.filterOptions("relationships", "MINOR");
              //   },
              // },
            },

            guardian_salutation: {
              "ui:widget": "CustomRadioWidget",
              // "ui:label": false,
              "ui:options": {
                // getOptions: (formData) => {
                //   return this.functionGroup?.getRequiredDocuments(
                //     this.optionsData["multi_validation_mapping"],
                //     {
                //       account_info: undefined,
                //     }
                //   );
                // },
                onChange: (value) => {
                  this.dropdownReset({
                    guardian_salutation: value,
                    guardian_gender: null,
                  });
                },
              },
            },

            guardian_gender: {
              // "ui:widget": "CascadeDropdown",
              // "ui:options": {
              //   getOptions: (formData, index) => {
              //     return this.filterOptions(
              //       "genders",
              //       formData?.related_party?.[index]?.guardian_salutation
              //     );
              //   },
              // },
            },

            guardian_marital_status: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions("marital_status");
                },
              },
            },

            guardian_last_name_not_available: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) => {
                  handleLastNameNotAvailableChange(
                    "guardian_last_name",
                    value,
                    "related_party",
                    index ?? 0
                  );
                },
                preserveValue: true,
              },
            },

            guardian_date_of_birth_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
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
                onChange: (value, index) =>
                  sameAsGuardianPermanentOnChange(value, index),
                preserveValue: true,
              },
            },
            guardian_email_not_available: {
              "ui:widget": "CustomCheckBoxWidget",
              "ui:label": false,
              "ui:options": {
                onChange: (value, index) => {
                  handleEmailNotAvailableChange(
                    "guardian_email",
                    value,
                    "related_party",
                    index ?? 0
                  );
                },
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
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "districts",
                    this.formData?.related_party?.[index]
                      ?.guardian_permanent_province
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

                    this.formData?.guardian_permanent_district
                  );
                },
              },
            },

            guardian_id_type_details: {
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
                  "id_type_id",
                  "identification_number",
                  "issue_country",
                  "issued_district",
                  "issuing_authority",
                  "issued_district_text",
                  "issuing_authority_text",
                  "id_issued_date_ad",
                  "id_issued_date_bs",
                  "id_expiry_date_ad",
                  "id_expiry_date_bs",
                  "visa_issued_date_ad",
                  "visa_expiry_date_ad",
                  "visa_type",
                  "national_id_number",
                  "nrn_card_number",
                  "comment",
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
                  //     const filterOption =
                  //       this.functionGroup?.getRequiredDocuments(
                  //         this.optionsData["multi_validation_mapping"],
                  //         {
                  //           nationality:
                  //             this.formData?.related_party?.[index[0]]
                  //               ?.guardian_nationality,
                  //           account_type: "INDIVIDUAL",
                  //         }
                  //       );
                  //     return filterOption;
                  //   },
                  // },
                },
                issue_country: {
                  // "ui:widget": "CascadeDropdown",
                  // "ui:options": {
                  //   getOptions: () => {
                  //     const option = this.filterOptions("countries");
                  //     return option;
                  //   },
                  //   setDisabled: (formData, index) =>
                  //     this.formData?.related_party?.[index]
                  //       ?.guardian_nationality === "NP",
                  // },
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
                    minimumDate: (formData, index) => {
                      const minDateValue = formData?.related_party?.[
                        index[0]
                      ]?.id_type_details?.map((item) =>
                        this.moment(
                          formData?.related_party?.[index[0]]
                            ?.guardian_date_of_birth_ad
                        )
                          .add(
                            formData?.related_party?.[index[0]]?.is_minor
                              ? 1
                              : 16,
                            formData?.related_party?.[index[0]]?.is_minor
                              ? "day"
                              : "years"
                          )
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
                        "related_party.guardian_id_type_details"
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
                      const minDateValue = formData?.related_party?.[
                        index[0]
                      ]?.id_type_details?.map((item) =>
                        this.NepaliDate.parseEnglishDate(
                          this.moment(
                            formData?.related_party?.[index[0]]
                              ?.guardian_date_of_birth_ad
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
                        "related_party.guardian_id_type_details"
                      );
                    },
                  },
                },

                id_expiry_date_ad: {
                  "ui:widget": widgets.CustomDatePicker,
                  "ui:placeholder": "Select Expiry Date (A.D)",
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
                        "related_party.guardian_id_type_details"
                      );
                    },
                  },
                },
                id_expiry_date_bs: {
                  "ui:widget": widgets.NepaliDatePickerR,
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
                        "related_party.guardian_id_type_details"
                      );
                    },
                  },
                },

                issuing_authority_text: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("issuing_authorities");
                      return option;
                    },
                  },
                },

                issuing_authority: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("issuing_authorities");
                      return option;
                    },
                    // setValue: (formData, index) => {
                    //   const document_types = {
                    //     citizenship_number:
                    //       "CTZN",
                    //     passport: "PP",
                    //     driving_license: "LCNSE",
                    //     voter_id: "VOTER",
                    //     nid: "ce66bc73-158b-42e5-b445-095c193d0137",
                    //   };
                    //   const issuing_authorities = {
                    //     citizenship_number:
                    //       "DAO",
                    //     passport: "DAO",
                    //     driving_license: "NA",
                    //     voter_id: "a4e3fa6d-133d-40da-8996-444207b7f2a2",
                    //     nid: "DONICR",
                    //   };

                    //   const currentIdType =
                    //     formData?.related_party?.[index[0]]?.id_type_details?.[
                    //       index[1]
                    //     ]?.id_type_id;

                    //   const matchingDocType = Object.entries(
                    //     document_types
                    //   ).find(([_, value]) => value === currentIdType);

                    //   if (matchingDocType) {
                    //     const [docTypeKey] = matchingDocType;
                    //     setTimeout(() => {
                    //       setFormData((prev) => ({
                    //         ...prev,
                    //         related_party: prev?.related_party?.map(
                    //           (item, idx) =>
                    //             idx === index[0]
                    //               ? {
                    //                   ...item,
                    //                   issuing_authority:
                    //                     issuing_authorities[docTypeKey],
                    //                 }
                    //               : item
                    //         ),
                    //       }));
                    //     }, 100);

                    //     return issuing_authorities[docTypeKey];
                    //   }

                    //   return null;
                    // },
                  },
                },
                issued_district: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: (formData, index) => {
                      const identification =
                        formData?.related_party?.[index[0]]
                          ?.guardian_id_type_details?.[index[1]]?.id_type_id;
                      return this.filterOptions(
                        identification === "PP" ||
                          identification ===
                            "4fcd4a69-59f3-4de2-986f-c56e07d223cd"
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
                        formData?.related_party?.[index[0]]
                          ?.guardian_id_type_details?.[index[1]]?.id_type_id;
                      return this.filterOptions(
                        identification === "PP" ||
                          identification ===
                            "4fcd4a69-59f3-4de2-986f-c56e07d223cd"
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
                    minDate: 0,
                    disableFutureDates: true,
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "related_party_visa_issued_date",
                        "related_party.id_type_details"
                      );
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
                    onDateChange: (selectedDate, index) => {
                      this.convertDate(
                        selectedDate,
                        setFormData,
                        true,
                        index,
                        "related_party_visa_expiry_date",
                        "related_party.id_type_details"
                      );
                    },
                  },
                },
                visa_type: {
                  "ui:placeholder": "Select Visa Type",
                },
              },
            },

            guardian_source_of_income: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                onChange: (value) =>
                  this.dropdownReset({
                    guardian_source_of_income: value,
                    guardian_business_type: null,
                  }),
                getOptions: (formData) => {
                  return this.filterOptions("income_sources");
                },
              },
            },

            guardian_occupation_detail: {
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
                guardian_designation: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("relationships");
                      return option;
                    },
                  },
                },
                guardian_business_type: {
                  "ui:widget": "CascadeDropdown",
                  "ui:options": {
                    getOptions: () => {
                      const option = this.filterOptions("business_type");
                      return option;
                    },
                  },
                },
              },
            },

            guardian_family_information: {
              "ui:widget": "EditableTableWidget",
              "ui:label": false,
              "ui:options": {
                addable: false,
                orderable: false,
                removable: false,
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
                        ? formData?.related_party?.[index?.[0]]
                            ?.guardian_family_information?.[index?.[1]]
                            ?.guardian_is_family_name_not_available ??
                          (formData?.related_party?.[index?.[0]]
                            ?.guardian_family_information?.[index?.[1]]
                            ?.guardian_family_member_relation === "FATHE" &&
                          formData?.related_party?.[index?.[0]]
                            ?.guardian_father_name
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
                        ? formData?.related_party?.[index?.[0]]
                            ?.guardian_family_information?.[index?.[1]]
                            ?.guardian_family_member_relation === "FATHE" &&
                          formData?.related_party?.[index?.[0]]
                            ?.guardian_father_name
                          ? true
                          : false
                        : true,
                    onChange: (value, index) => {
                      this.familyNameChange(
                        "guardian_family_member_full_name",
                        value,
                        "related_party.guardian_family_information",
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

            guardian_personal_info_screening: {
              "ui:widget": "hidden",
              "ui:label": false,
              "ui:options": {
                disableButton: (formData, index) =>
                  !formData?.related_party?.[
                    index
                  ]?.guardian_first_name?.trim(),
                onClick: (index) => {
                  this.fetchRelatedPartyGuardianInfoScreening(index ?? 0);
                },
              },
            },
            guardian_personal_screening_data: {
              "ui:widget": "ScreeningReportCard",
              "ui:label": false,
              showCheckbox: this.form_status?.includes("init") ? true : false,
              fixedActionsColumn: true,
              showFooter: true,
              "ui:options": {
                showActionText: true,
                onCheckboxChange: (tableData, category, checked, index) =>
                  this.setFormData((prevData) => ({
                    ...prevData,
                    related_party: prevData?.related_party?.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            [category === "pep_nba"
                              ? "guardian_pep"
                              : category === "sanction_moha"
                              ? "guardian_sanction"
                              : category]: checked ? "Yes" : "No",
                            guardian_personal_screening_data: tableData,
                          }
                        : item
                    ),
                  })),

                actionHandlers: {
                  view: (record) => setIsModalVisible(true),
                },
              },
            },

            guardian_permanent_province: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions("provinces");
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      guardian_permanent_province: value,
                      guardian_permanent_district: "",
                      guardian_permanent_municipality: "",
                      guardian_permanent_ward_number: "",
                      guardian_permanent_street_name: "",
                      guardian_permanent_town: "",
                      guardian_permanent_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            guardian_permanent_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "districts",
                    formData.related_party &&
                      formData.related_party?.[index]
                        ?.guardian_permanent_province
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      guardian_permanent_district: value,
                      guardian_permanent_municipality: "",
                      guardian_permanent_ward_number: "",
                      guardian_permanent_street_name: "",
                      guardian_permanent_town: "",
                      guardian_permanent_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            guardian_permanent_municipality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "local_bodies",
                    formData.related_party &&
                      formData.related_party?.[index]
                        ?.guardian_permanent_district
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      guardian_permanent_municipality: value,
                      guardian_permanent_ward_number: "",
                      guardian_permanent_street_name: "",
                      guardian_permanent_town: "",
                      guardian_permanent_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            guardian_date_of_birth_ad: {
              "ui:widget": widgets.CustomDatePicker,
              "ui:placeholder": "Select Date of Birth (A.D)",
              "ui:options": {
                name: "guardian_date_of_birth_ad",
                enforceAgeRestriction: true,
                validAge: 18,
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    true,
                    "guardian_date_of_birth_ad",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },
            guardian_date_of_birth_bs: {
              "ui:widget": widgets.NepaliDatePickerR,
              "ui:options": {
                enforceAgeRestriction: true,
                name: "guardian_date_of_birth_bs",
                validAge: 18,
                onDateChange: (selectedDate, index) => {
                  this.convertDateSingle(
                    selectedDate,
                    setFormData,
                    false,
                    "guardian_date_of_birth_bs",
                    "related_party",
                    index ? index : 0
                  );
                },
              },
            },

            guardian_current_country: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: () => {
                  const option = this.filterOptions("countries");
                  return option;
                },
              },
            },

            guardian_current_province: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions("provinces");
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      guardian_current_province: value,
                      guardian_current_district: "",
                      guardian_current_municipality: "",
                      guardian_current_ward_number: "",
                      guardian_current_street_name: "",
                      guardian_current_town: "",
                      guardian_current_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            guardian_current_district: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "districts",
                    formData.related_party &&
                      formData.related_party?.[index]?.guardian_current_province
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      guardian_current_district: value,
                      guardian_current_municipality: "",
                      guardian_current_ward_number: "",
                      guardian_current_street_name: "",
                      guardian_current_town: "",
                      guardian_current_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            guardian_current_municipality: {
              "ui:widget": "CascadeDropdown",
              "ui:options": {
                getOptions: (formData, index) => {
                  return this.filterOptions(
                    "local_bodies",
                    formData.related_party &&
                      formData.related_party?.[index]?.guardian_current_district
                  );
                },
                onChange: (value, index) =>
                  this.dropdownReset(
                    {
                      guardian_current_municipality: value,
                      guardian_current_ward_number: "",
                      guardian_current_street_name: "",
                      guardian_current_town: "",
                      guardian_current_house_number: "",
                    },
                    "related_party",
                    index ?? 0
                  ),
              },
            },

            guardian_current_ward_number: {},
            guardian_current_street_name: {},
            guardian_current_town: {},
            guardian_current_house_number: {},
            guardian_current_outside_town: {},
            guardian_current_outside_street_name: {},
            guardian_current_postal_code: {},

            guardian_risk_score: {
              "ui:widget": "hidden",
              "ui:label": false,
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
                    return (
                      value !== undefined && value !== null && value !== ""
                    );
                  });

                  return this.form_status?.includes("init") && !allFilled;
                },
                onClick: (index) => {
                  this.calculateGuardianRiskDynamic(index ?? 0);
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
