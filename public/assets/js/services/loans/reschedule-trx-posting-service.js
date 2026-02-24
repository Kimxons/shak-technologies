(function (global) {
  const CoreApi = global.CoreApi;
  const SearchService = global.SearchService;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  /**
   * RescheduleTrxPostingService
   * Service for Reschedule Transaction Posting operations
   * Handles database calls for viewing, adding, updating reschedule transaction details
   */
  const RescheduleTrxPostingService = {
    
    moduleID: "4404",
    dynamicValues: {},

    setDynamicValue(key, value) {
      this.dynamicValues[key] = value;
    },

    getDynamicValue(key) {
      return this.dynamicValues[key] || null;
    },

    getOperatorId() {
      if (global.AuthService && global.AuthService.getSession) {
        const session = global.AuthService.getSession();
        return session?.operatorID || session?.operatorId || "web_portal";
      }
      return "web_portal";
    },

    getOurBranchId() {
      return this.getDynamicValue("BranchID") || "";
    },

    /**
     * DATABASE CALL #1: BRANCH ID SEARCH
     * exec dbo.p_GetSearchResult @TableID=N'BranchID',@WhereStmt=N'OurBranchID LIKE ''%000%''',
     * @PrevOrNext=N'1',@RefID=N'',@OperatorID=N'web_portal',@ModuleID=N'4404',
     * @OurBranchID=N'000',@AdvFilterString=N'',@SearchKey=N''
     * Returns: OurBranchID, BranchName, CurrencyID
     */
    async searchBranch(searchKey, ourBranchID) {
      try {
        if (SearchService && SearchService.search) {
          return await SearchService.search({
            tableID: 'BranchID',
            searchKey: searchKey || '',
            moduleID: this.moduleID,
            ourBranchID: ourBranchID || '',
            operatorID: this.getOperatorId()
          });
        }

        // Fallback: Direct API call
        const payload = {
          TableID: 'BranchID',
          WhereStmt: searchKey ? `OurBranchID LIKE '%${searchKey}%'` : '',
          PrevOrNext: 1,
          RefID: '',
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          OurBranchID: ourBranchID || '',
          AdvFilterString: '',
          SearchKey: searchKey || ''
        };

        const envelope = CoreApi.makeRequestEnvelope('p_GetSearchResult', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        return result?.data?.Details || result?.Details || [];
      } catch (error) {
        console.error('[RescheduleTrxPostingService] searchBranch failed:', error);
        throw error;
      }
    },

    /**
     * DATABASE CALL #2: CLIENT ID SEARCH
     * exec p_GetSearchResult @WhereStmt=N'',@TableID=N'ClientAccountID',@RefID=NULL,@PrevOrNext=0,
     * @AdvFilterString=N'ProductTypeID =''LN'' AND OurBranchID=''1201''',
     * @OperatorID=N'MARTIN_MARANGA',@ModuleID=4404,@OurBranchID=N'1201',@SearchKey=NULL,@LanguageID='en'
     * Returns: ClientID, ClientName
     */
    async searchClient(searchKey, ourBranchID) {
      try {
        if (SearchService && SearchService.search) {
          return await SearchService.search({
            tableID: 'ClientAccountID',
            searchKey: searchKey || '',
            moduleID: this.moduleID,
            ourBranchID: ourBranchID || '',
            operatorID: this.getOperatorId(),
            advFilterString: `ProductTypeID ='LN' AND OurBranchID='${ourBranchID}'`
          });
        }

        // Fallback: Direct API call
        const payload = {
          TableID: 'ClientAccountID',
          WhereStmt: '',
          PrevOrNext: 0,
          RefID: null,
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          OurBranchID: ourBranchID || '',
          AdvFilterString: `ProductTypeID ='LN' AND OurBranchID='${ourBranchID}'`,
          SearchKey: searchKey || null,
          LanguageID: 'en'
        };

        const envelope = CoreApi.makeRequestEnvelope('p_GetSearchResult', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        return result?.data?.Details || result?.Details || [];
      } catch (error) {
        console.error('[RescheduleTrxPostingService] searchClient failed:', error);
        throw error;
      }
    },

    /**
     * DATABASE CALL #3: ACCOUNT ID SEARCH
     * exec p_GetSearchResult @WhereStmt=N'',@TableID=N'RescheduleIniAccount',@RefID=NULL,@PrevOrNext=0,
     * @AdvFilterString=N'OurBranchID=''1201''',@OperatorID=N'MARTIN_MARANGA',
     * @ModuleID=4404,@OurBranchID=N'1201',@SearchKey=NULL,@LanguageID='en'
     * Returns: AccountID, Name, LoanSeries
     */
    async searchAccount(searchKey, ourBranchID) {
      try {
        if (SearchService && SearchService.search) {
          return await SearchService.search({
            tableID: 'RescheduleIniAccount',
            searchKey: searchKey || '',
            moduleID: this.moduleID,
            ourBranchID: ourBranchID || '',
            operatorID: this.getOperatorId(),
            advFilterString: `OurBranchID='${ourBranchID}'`
          });
        }

        // Fallback: Direct API call
        const payload = {
          TableID: 'RescheduleIniAccount',
          WhereStmt: '',
          PrevOrNext: 0,
          RefID: null,
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          OurBranchID: ourBranchID || '',
          AdvFilterString: `OurBranchID='${ourBranchID}'`,
          SearchKey: searchKey || null,
          LanguageID: 'en'
        };

        const envelope = CoreApi.makeRequestEnvelope('p_GetSearchResult', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        return result?.data?.Details || result?.Details || [];
      } catch (error) {
        console.error('[RescheduleTrxPostingService] searchAccount failed:', error);
        throw error;
      }
    },

    /**
     * DATABASE CALL #4: GET LOAN RESCHEDULE POST DETAIL (VIEW CLICK)
     * exec p_GetLoanReschPostDetail @OurBranchID='1201',@AccountID='1201806000001',@OperatorID='MARTIN_MARANGA'
     * Returns: Full reschedule posting details with all fields
     */
    async getLoanReschPostDetail(ourBranchID, accountID) {
      try {
        const payload = {
          OurBranchID: ourBranchID,
          AccountID: accountID,
          OperatorID: this.getOperatorId()
        };

        console.log('[RescheduleTrxPostingService] getLoanReschPostDetail payload:', payload);

        const envelope = CoreApi.makeRequestEnvelope('p_GetLoanReschPostDetail', payload);
        console.log('[RescheduleTrxPostingService] Request envelope:', envelope);

        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        console.log('[RescheduleTrxPostingService] getLoanReschPostDetail raw response:', result);

        // Extract and map response - handle multiple response formats
        let responseData = null;
        
        if (result) {
          // Try different response structure formats
          responseData = result?.data?.Details || 
                        result?.Details || 
                        result?.data || 
                        result;
          
          console.log('[RescheduleTrxPostingService] Extracted response data:', responseData);
        }

        // Handle array response
        if (Array.isArray(responseData)) {
          console.log('[RescheduleTrxPostingService] Response is array, length:', responseData.length);
          const detail = responseData.length > 0 ? responseData[0] : null;
          if (detail) {
            console.log('[RescheduleTrxPostingService] getLoanReschPostDetail detail found:', detail);
          } else {
            console.warn('[RescheduleTrxPostingService] getLoanReschPostDetail array is empty');
          }
          return detail;
        }

        // Handle object response
        if (responseData && typeof responseData === 'object') {
          console.log('[RescheduleTrxPostingService] getLoanReschPostDetail detail found:', responseData);
          return responseData;
        }

        console.warn('[RescheduleTrxPostingService] getLoanReschPostDetail no valid detail found');
        return null;
      } catch (error) {
        console.error('[RescheduleTrxPostingService] getLoanReschPostDetail failed:', error);
        console.error('[RescheduleTrxPostingService] Error details:', error.message, error.stack);
        throw error;
      }
    },

    /**
     * DATABASE CALL #5: GET RESCHEDULE LOAN POST TRANSACTIONS (PROCEED CLICK)
     * exec p_GetReschLoanPostTrx @OurBranchID='1201',@AccountID='1201806000001',@LoanSeries=1,
     * @TrxTypeID='T',@AccountTypeID='C',@ContraAccountID='1201806000001',@TrxCurrencyID='ETB',
     * @ValueDate='2025-08-29 00:00:00',@ReferenceNo='',@ClientContribution=1000,@LocalAmount=0,
     * @ExchangeRate=1,@MeanRate=0,@Profit=0,@Narration='',@OperatorID='MARTIN_MARANGA'
     * Returns: Transaction lines array with all posting details
     */
    async getReschLoanPostTrx(params) {
      try {
        const payload = {
          OurBranchID: params.ourBranchID,
          AccountID: params.accountID,
          LoanSeries: parseInt(params.loanSeries) || 1,
          TrxTypeID: params.trxTypeID || 'T',
          AccountTypeID: params.accountTypeID || 'C',
          ContraAccountID: params.contraAccountID || '',
          TrxCurrencyID: params.trxCurrencyID || 'ETB',
          ValueDate: params.valueDate,
          ReferenceNo: params.referenceNo || '',
          ClientContribution: parseFloat(params.clientContribution) || 0,
          LocalAmount: parseFloat(params.localAmount) || 0,
          ExchangeRate: parseFloat(params.exchangeRate) || 1,
          MeanRate: parseFloat(params.meanRate) || 0,
          Profit: parseFloat(params.profit) || 0,
          Narration: params.narration || '',
          OperatorID: this.getOperatorId()
        };

        console.log('[RescheduleTrxPostingService] getReschLoanPostTrx payload:', payload);

        const envelope = CoreApi.makeRequestEnvelope('p_GetReschLoanPostTrx', payload);
        console.log('[RescheduleTrxPostingService] Request envelope:', envelope);

        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        console.log('[RescheduleTrxPostingService] getReschLoanPostTrx raw response:', result);

        // Return full transaction details array - handle multiple response formats
        let transactions = [];
        
        if (result) {
          const responseData = result?.data?.Details || 
                              result?.Details || 
                              result?.data || 
                              result;
          
          console.log('[RescheduleTrxPostingService] Extracted response data:', responseData);
          
          if (Array.isArray(responseData)) {
            transactions = responseData;
          } else if (responseData && typeof responseData === 'object') {
            transactions = [responseData];
          }
        }

        console.log('[RescheduleTrxPostingService] getReschLoanPostTrx transactions:', transactions);
        return transactions;
      } catch (error) {
        console.error('[RescheduleTrxPostingService] getReschLoanPostTrx failed:', error);
        console.error('[RescheduleTrxPostingService] Error details:', error.message, error.stack);
        throw error;
      }
    },

    /**
     * DATABASE CALL #3: VALIDATE EXCHANGE RATE
     * exec p_ValidateCurrencyRate @LocalCurrency, @ExchangeRate, @TransactionType, @ProductCurrency, @OurBranchID
     * Returns: Validated exchange rate with market data
     */
    async validateExchangeRate(localCurrency, exchangeRate, transactionType, productCurrency, ourBranchID) {
      try {
        const payload = {
          LocalCurrency: localCurrency,
          ExchangeRate: exchangeRate,
          TransactionType: transactionType,
          ProductCurrency: productCurrency,
          OurBranchID: ourBranchID
        };

        const envelope = CoreApi.makeRequestEnvelope('p_ValidateCurrencyRate', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        return {
          isValid: result?.success === true || result?.success === "true",
          marketRate: result?.data?.MarketRate,
          gainLoss: result?.data?.GainLoss,
          message: result?.message || ""
        };
      } catch (error) {
        console.error('[RescheduleTrxPostingService] validateExchangeRate failed:', error);
        throw error;
      }
    },

    /**
     * DATABASE CALL #4: CALCULATE LOCAL AMOUNT
     * exec p_CalculateLocalAmount @Amount, @ExchangeRate
     * Returns: Calculated local amount
     */
    async calculateLocalAmount(amount, exchangeRate) {
      try {
        const payload = {
          Amount: parseFloat(amount) || 0,
          ExchangeRate: parseFloat(exchangeRate) || 1.0
        };

        const envelope = CoreApi.makeRequestEnvelope('p_CalculateLocalAmount', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        return {
          localAmount: result?.data?.LocalAmount || result?.LocalAmount || (payload.Amount * payload.ExchangeRate),
          success: result?.success === true || result?.success === "true"
        };
      } catch (error) {
        console.error('[RescheduleTrxPostingService] calculateLocalAmount failed:', error);
        throw error;
      }
    },

    /**
     * DATABASE CALL #5: CALCULATE FOREX GAIN/LOSS
     * exec p_CalculateForexGainLoss @TransactionAmount, @ExchangeRate, @MarketRate, @TransactionType
     * Returns: Calculated forex gain or loss amount
     */
    async calculateForexGainLoss(transactionAmount, exchangeRate, marketRate, transactionType) {
      try {
        const payload = {
          TransactionAmount: parseFloat(transactionAmount) || 0,
          ExchangeRate: parseFloat(exchangeRate) || 1.0,
          MarketRate: parseFloat(marketRate) || 1.0,
          TransactionType: transactionType || 'CSH'
        };

        const envelope = CoreApi.makeRequestEnvelope('p_CalculateForexGainLoss', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        return {
          gainLoss: result?.data?.GainLoss || result?.GainLoss || 0,
          success: result?.success === true || result?.success === "true"
        };
      } catch (error) {
        console.error('[RescheduleTrxPostingService] calculateForexGainLoss failed:', error);
        throw error;
      }
    },

    /**
     * DATABASE CALL #6: SAVE LOAN RESCHEDULE POST TRANSACTION (SAVE CLICK)
     * exec p_AddLoanReschPostTrx @OurBranchID=N'1201',@AccountID=N'1201806000001',@LoanSeries=1,
     * @DetailRecords=@p4,@CreatedBy=N'MARTIN_MARANGA',@CreatedOn='2026-02-04 09:09:00',
     * @ModifiedBy=N'MARTIN_MARANGA',@ModifiedOn=NULL,@SupervisedBy=NULL,@SupervisedOn=NULL,
     * @TrxBatchID=@p11 output,@TrxSerialID=@p12 output
     * Returns: TrxBatchID and TrxSerialID
     */
    async addLoanReschPostTrx(params) {
      try {
        // Build DetailRecords XML from transaction array
        let detailRecordsXml = '';
        if (params.transactions && params.transactions.length > 0) {
          params.transactions.forEach(trx => {
            detailRecordsXml += '<dt_Transactions>';
            detailRecordsXml += `<OurBranchID>${trx.OurBranchID || params.ourBranchID}</OurBranchID>`;
            detailRecordsXml += `<AccountTypeID>${trx.AccountTypeID || ''}</AccountTypeID>`;
            detailRecordsXml += `<AccountID>${trx.AccountID || ''}</AccountID>`;
            detailRecordsXml += `<ProductID>${trx.ProductID || ''}</ProductID>`;
            detailRecordsXml += `<TrxDate>${trx.TrxDate || new Date().toISOString()}</TrxDate>`;
            detailRecordsXml += `<TrxTypeID>${trx.TrxTypeID || ''}</TrxTypeID>`;
            detailRecordsXml += `<TrxCurrencyID>${trx.TrxCurrencyID || ''}</TrxCurrencyID>`;
            detailRecordsXml += `<ValueDate>${trx.ValueDate || new Date().toISOString()}</ValueDate>`;
            detailRecordsXml += `<TrxAmount>${trx.TrxAmount || trx.Amount || 0}</TrxAmount>`;
            detailRecordsXml += `<Amount>${trx.Amount || 0}</Amount>`;
            detailRecordsXml += `<LocalAmount>${trx.LocalAmount || 0}</LocalAmount>`;
            detailRecordsXml += `<ExchangeRate>${trx.ExchangeRate || 1}</ExchangeRate>`;
            detailRecordsXml += `<MeanRate>${trx.MeanRate || 1}</MeanRate>`;
            detailRecordsXml += `<TrxDescriptionID>${trx.TrxDescriptionID || ''}</TrxDescriptionID>`;
            detailRecordsXml += `<TrxDescription>${trx.TrxDescription || ''}</TrxDescription>`;
            detailRecordsXml += `<Profit>${trx.Profit || 0}</Profit>`;
            detailRecordsXml += `<MainGLID>${trx.MainGLID || ''}</MainGLID>`;
            detailRecordsXml += `<TrxBatchSLNo>${trx.TrxBatchSLNo || 0}</TrxBatchSLNo>`;
            detailRecordsXml += `<AccountType>${trx.AccountType || ''}</AccountType>`;
            detailRecordsXml += `<TrxType>${trx.TrxType || ''}</TrxType>`;
            detailRecordsXml += `<Name>${trx.Name || ''}</Name>`;
            detailRecordsXml += `<Remarks>${trx.Remarks || ''}</Remarks>`;
            detailRecordsXml += '<DS_Transactions_Id>0</DS_Transactions_Id>';
            detailRecordsXml += '</dt_Transactions>';
          });
        }

        const payload = {
          OurBranchID: params.ourBranchID,
          AccountID: params.accountID,
          LoanSeries: parseInt(params.loanSeries) || 1,
          DetailRecords: detailRecordsXml,
          CreatedBy: params.createdBy || this.getOperatorId(),
          CreatedOn: params.createdOn || new Date().toISOString(),
          ModifiedBy: params.modifiedBy || this.getOperatorId(),
          ModifiedOn: params.modifiedOn || null,
          SupervisedBy: params.supervisedBy || null,
          SupervisedOn: params.supervisedOn || null
        };

        console.log('[RescheduleTrxPostingService] addLoanReschPostTrx payload:', payload);

        const envelope = CoreApi.makeRequestEnvelope('p_AddLoanReschPostTrx', payload);
        console.log('[RescheduleTrxPostingService] Request envelope:', envelope);

        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        console.log('[RescheduleTrxPostingService] addLoanReschPostTrx raw response:', result);

        return {
          success: result?.success === true || result?.success === "true",
          message: result?.message || "Transaction saved successfully",
          trxBatchID: result?.data?.TrxBatchID || result?.TrxBatchID || null,
          trxSerialID: result?.data?.TrxSerialID || result?.TrxSerialID || null,
          data: result?.data
        };
      } catch (error) {
        console.error('[RescheduleTrxPostingService] addLoanReschPostTrx failed:', error);
        console.error('[RescheduleTrxPostingService] Error details:', error.message, error.stack);
        throw error;
      }
    },

    /**
     * Initialize all dropdowns from system codes
     * Uses LookupService.getSystemCodeOptions (same as LoanMaintenance)
     */
    async initializeAllDropdowns() {
      try {
        console.log('[RescheduleTrxPostingService] Initializing all dropdowns...');

        const dropdownMap = {
          TransactionType: 'CashOrTrf',
          AccountType: 'AccountTypeID'
        };

        const tasks = Object.entries(dropdownMap)
          .filter(([elementId]) => document.getElementById(elementId))
          .map(async ([elementId, systemCodeType]) => {
            console.log(`[RescheduleTrxPostingService] Loading ${systemCodeType} for ${elementId}`);
            
            if (global.LookupService && global.LookupService.getSystemCodeOptions) {
              try {
                const options = await global.LookupService.getSystemCodeOptions(systemCodeType);
                this.populateDropdown(elementId, options || []);
              } catch (error) {
                console.error(`[RescheduleTrxPostingService] Error loading ${systemCodeType}:`, error);
                // Use fallback defaults if LookupService fails
                this.populateDropdownWithFallback(elementId);
              }
            } else {
              console.warn('[RescheduleTrxPostingService] LookupService not available, using fallback');
              this.populateDropdownWithFallback(elementId);
            }
          });

        await Promise.all(tasks);
        console.log('[RescheduleTrxPostingService] All dropdowns initialized');
      } catch (error) {
        console.error('[RescheduleTrxPostingService] Failed to initialize dropdowns:', error);
      }
    },

    /**
     * Populate a dropdown with options
     * @param {string} elementId - The ID of the select element
     * @param {Array} options - Array of { value, label } objects
     */
    populateDropdown(elementId, options = []) {
      const element = document.getElementById(elementId);
      if (!element) {
        console.warn(`[RescheduleTrxPostingService] Dropdown element not found: ${elementId}`);
        return;
      }

      // Always clear and add placeholder
      element.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '--Select--';
      element.appendChild(placeholder);

      // Add options
      options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        element.appendChild(option);
      });

      // Set default selection: first DB value if present
      if (options.length > 0) {
        element.selectedIndex = 1;
      }

      console.log(`[RescheduleTrxPostingService] Populated ${elementId} with ${options.length} options`);
    },

    /**
     * Populate dropdown with fallback defaults
     */
    populateDropdownWithFallback(elementId) {
      const fallbacks = {
        TransactionType: [
          { value: 'T', label: 'Transfer' },
          { value: 'C', label: 'Cash' },
          { value: 'JV', label: 'Journal Voucher' }
        ],
        AccountType: [
          { value: 'C', label: 'Customer' },
          { value: 'G', label: 'GL' },
          { value: 'I', label: 'Internal' }
        ]
      };

      const options = fallbacks[elementId] || [];
      this.populateDropdown(elementId, options);
      console.log(`[RescheduleTrxPostingService] Populated ${elementId} with fallback options`);
    },

    async getTillDetails() {
      try {
        const payload = {
          CashierID: this.getOperatorId()
        };

        console.log('[RescheduleTrxPostingService] getTillDetails payload:', payload);

        const envelope = CoreApi.makeRequestEnvelope('pc_GetTillDetailPerTill', payload);
        console.log('[RescheduleTrxPostingService] Request envelope:', envelope);

        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        console.log('[RescheduleTrxPostingService] getTillDetails raw response:', result);

        // Extract till details - handle multiple response formats
        let tills = [];
        
        if (result) {
          const responseData = result?.data?.Details || 
                              result?.Details || 
                              result?.data || 
                              result;
          
          console.log('[RescheduleTrxPostingService] Extracted response data:', responseData);
          
          if (Array.isArray(responseData)) {
            tills = responseData;
          } else if (responseData && typeof responseData === 'object') {
            tills = [responseData];
          }
        }

        console.log('[RescheduleTrxPostingService] getTillDetails tills:', tills);
        return tills;
      } catch (error) {
        console.error('[RescheduleTrxPostingService] getTillDetails failed:', error);
        console.error('[RescheduleTrxPostingService] Error details:', error.message, error.stack);
        throw error;
      }
    },

    /**
     * DATABASE CALL #8: GET DENOMINATION DETAILS
     * exec p_GetDenominationBreakdown @OurBranchID, @CurrencyID, @OperatorTillID, @Amount, @TransactionType, @WorkingDate
     * Returns: Currency denomination breakdown
     */
    async getDenominationBreakdown(ourBranchID, currencyID, operatorTillID, amount, transactionType, workingDate) {
      try {
        const payload = {
          OurBranchID: ourBranchID,
          CurrencyID: currencyID,
          OperatorTillID: operatorTillID,
          Amount: parseFloat(amount) || 0,
          TransactionType: transactionType,
          WorkingDate: workingDate,
          OperatorID: this.getOperatorId()
        };

        const envelope = CoreApi.makeRequestEnvelope('p_GetDenominationBreakdown', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        return result?.data?.Details || result?.Details || [];
      } catch (error) {
        console.error('[RescheduleTrxPostingService] getDenominationBreakdown failed:', error);
        throw error;
      }
    },

    /**
     * DATABASE CALL #8: CHECK USER RIGHTS
     * exec p_CheckUserRights @OurBranchID, @AccountID, @LoanSeries, @OperatorID, @ModuleID, @EventID
     * Returns: Whether user has rights to perform the action
     */
    async checkUserRights(ourBranchID, accountID, loanSeries, eventID) {
      try {
        const payload = {
          OurBranchID: ourBranchID,
          AccountID: accountID,
          LoanSeries: loanSeries,
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          EventID: eventID
        };

        const envelope = CoreApi.makeRequestEnvelope('p_CheckUserRights', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);

        return {
          hasRights: result?.success === true || result?.success === "true",
          message: result?.message || "",
          data: result?.data
        };
      } catch (error) {
        console.error('[RescheduleTrxPostingService] checkUserRights failed:', error);
        throw error;
      }
    }
  };

  global.RescheduleTrxPostingService = RescheduleTrxPostingService;
})(window);
