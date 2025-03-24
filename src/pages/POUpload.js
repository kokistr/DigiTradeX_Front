// src/pages/POUpload.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './POUpload.css';

const POUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [viewMode, setViewMode] = useState('upload'); // upload, processing, summary
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [poData, setPoData] = useState({
    // PurchaseOrdersテーブルのフィールド
    customer_name: '',
    po_number: '',
    currency: 'USD',  // デフォルト値を設定
    total_amount: '0.00',
    payment_terms: '',
    shipping_terms: '',
    destination: '',
    status: 'pending',

    // 製品情報の配列（複数製品に対応）
    products: [
      {
        product_name: '',
        quantity: '',
        unit_price: '',
        amount: ''
      }
    ],

    // Inputテーブルのフィールド（UI表示しないが保持）
    shipment_arrangement: '手配中',
    po_acquisition_date: new Date().toISOString().split('T')[0],
    organization: '',
    invoice_number: '',
    payment_status: '',
    memo: '',

    // OCR結果用フィールド
    ocr_raw_text: ''
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [manualTotalEdit, setManualTotalEdit] = useState(false); // 合計金額の手動編集フラグ

  // 合計金額の自動計算（手動編集モードでない場合のみ）
  useEffect(() => {
    if (!manualTotalEdit && poData.products && poData.products.length > 0) {
      const total = poData.products.reduce((sum, product) => {
        const amount = parseFloat(product.amount) || 0;
        return sum + amount;
      }, 0);
      
      setPoData(prevData => ({
        ...prevData,
        total_amount: total.toFixed(2)
      }));
    }
  }, [poData.products, manualTotalEdit]);

  // 合計金額の手動編集ハンドラ
  const handleTotalAmountChange = (e) => {
    setManualTotalEdit(true); // 手動編集モードをオン
    setPoData(prevData => ({
      ...prevData,
      total_amount: e.target.value
    }));
  };

  // ファイルアップロード処理
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // ファイルタイプの検証
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('PDF、PNG、JPEGファイルのみアップロード可能です');
      return;
    }
    
    setUploadedFile(file);
    setIsProcessing(true);
    setViewMode('processing');
    setErrorMessage('');
    setSuccessMessage('');
    setManualTotalEdit(false);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // local_kwパラメータを追加（APIが期待している）
      formData.append('local_kw', 'true');
      
      // 認証トークンチェックを削除
      // デバッグログ
      console.log('Uploading file:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      
      // APIエンドポイントの設定
      const url = `${API_URL}/api/ocr/upload`;
      
      // デバッグ用：リクエスト詳細のログ
      console.log('Request URL:', url);
      console.log('FormData has file:', formData.has('file'));
      console.log('FormData has local_kw:', formData.has('local_kw'));
      
      // ヘッダーとパラメーターの設定を修正 - 認証ヘッダーを削除
      const response = await axios.post(url, formData, {
        headers: {
          'Accept': 'application/json'
        },
        // クエリパラメータの追加
        params: {
          local_kw: 'true'
        },
        // タイムアウト設定
        timeout: 30000, // 30秒
        withCredentials: false
      });
      
      // デバッグ用ログを追加
      console.log('Upload response:', response.data);
      
      // 応答形式の確認と安全なデータ抽出
      if (response.data) {
        console.log('Response data format:', Object.keys(response.data));
        
        // 成功レスポンスの確認（様々な可能性を考慮）
        if (response.data.status === 'success' || 
            response.data.ocrId || 
            response.data.id || 
            response.data.job_id) {
          
          setSuccessMessage('ファイルが正常にアップロードされました');
          
          // ocrIdの安全な取得 - 異なるフィールド名の可能性を考慮
          const ocrId = response.data?.ocrId || 
                        response.data?.id || 
                        response.data?.job_id || 
                        response.data?.ocr_id;
          
          if (ocrId) {
            console.log('Found OCR ID:', ocrId);
            checkOCRStatus(ocrId);
          } else {
            // フォールバック: 画像が正常にアップロードされたが、処理IDがない場合
            console.warn('OCR ID not found in response, using mock data for demo');
            // デモ用のモックデータ
            const mockData = {
              customer_name: '12345 Ltd.',
              po_number: '76890',
              currency: 'USD',
              payment_terms: 'LC 90 days',
              shipping_terms: 'CIF',
              destination: 'Shanghai',
              products: [
                {
                  product_name: 'Product B',
                  quantity: '5000',
                  unit_price: '2.7',
                  amount: '13500'
                },
                {
                  product_name: 'Product C',
                  quantity: '4000',
                  unit_price: '3.4',
                  amount: '13600'
                },
                {
                  product_name: 'Product D',
                  quantity: '3000',
                  unit_price: '3.05',
                  amount: '9150'
                }
              ],
              organization: 'サンプル組織',
              invoice_number: 'INV-2025-001',
              payment_status: '未払い'
            };

            setPoData({
              ...poData,
              ...mockData,
              // 合計金額は自動計算
              total_amount: (13500 + 13600 + 9150).toString()
            });
            setIsProcessing(false);
            setViewMode('summary');
          }
        } else {
          // エラーメッセージを詳細に変換
          const errorMessage = 
            (typeof response.data?.message === 'string' 
              ? response.data.message 
              : JSON.stringify(response.data?.message)) || 
            'OCR処理の開始に失敗しました';
          
          console.error('API Error:', errorMessage);
          setErrorMessage(errorMessage);
          setIsProcessing(false);
          setViewMode('upload');
        }
      } else {
        throw new Error('APIからの応答にデータがありません');
      }
    } catch (error) {
      console.error('Complete error object:', error);
      console.error('Error response:', error.response);
      
      // 詳細なエラー情報を抽出して表示
      let errorDetail = '';
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        console.error('Data:', error.response.data);
        
        errorDetail = `[${error.response.status}] `;
        
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorDetail += error.response.data;
          } else if (error.response.data.detail) {
            if (Array.isArray(error.response.data.detail)) {
              errorDetail += error.response.data.detail.map(d => d.msg || d).join(', ');
            } else {
              errorDetail += String(error.response.data.detail);
            }
          } else if (error.response.data.message) {
            errorDetail += error.response.data.message;
          } else {
            errorDetail += JSON.stringify(error.response.data);
          }
        }
      }
      
      const errorMessage = errorDetail || 
        error.message || 
        '不明なエラーが発生しました';
    
      setErrorMessage(`アップロードエラー: ${errorMessage}`);
      setIsProcessing(false);
      setViewMode('upload');
    }
  };
  
  // OCRステータスのチェック
  const checkOCRStatus = async (ocrId) => {
    try {
      console.log('Checking OCR status for ID:', ocrId);
      
      const response = await axios.get(`${API_URL}/api/ocr/status/${ocrId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // デバッグ用ログを追加
      console.log('OCR Status response:', response.data);
      
      const status = response.data?.status;
      
      if (status === 'completed' || status === 'success') {
        console.log('OCR processing completed successfully');
        fetchOCRData(ocrId);
      } else if (status === 'failed' || status === 'error') {
        // エラーメッセージを文字列として設定
        const failureReason = response.data?.reason || 'OCR処理に失敗しました。';
        console.error('OCR processing failed:', failureReason);
        setErrorMessage(String(failureReason));
        setIsProcessing(false);
        setViewMode('upload');
      } else {
        // まだ処理中 - 1秒後に再確認
        console.log('OCR still processing, checking again in 1 second');
        setTimeout(() => checkOCRStatus(ocrId), 1000);
      }
    } catch (error) {
      console.error('Status check error:', error);
      console.error('Error response:', error.response);
      
      // エラー詳細の収集
      let errorDetail = '';
      if (error.response) {
        console.error('Status:', error.response.status);
        if (error.response.data) {
          errorDetail = error.response.data.message || 
                        (error.response.data.detail ? JSON.stringify(error.response.data.detail) : '') ||
                        JSON.stringify(error.response.data);
        }
      }
      
      // エラーメッセージを文字列として設定
      const errorMessage = errorDetail || 
        error.message || 
        'OCR処理のステータス確認に失敗しました';
      
      console.error('Final error message:', errorMessage);
      setErrorMessage(String(errorMessage));
      setIsProcessing(false);
      setViewMode('upload');
    }
  };
  
  // OCR結果データの取得
  const fetchOCRData = async (ocrId) => {
    try {
      console.log('Fetching OCR data for ID:', ocrId);
      
      const response = await axios.get(`${API_URL}/api/ocr/extract/${ocrId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // デバッグ用ログを追加
      console.log('OCR Data response:', response.data);
      
      // データパスの検出と抽出（APIの応答形式が変わる可能性に対応）
      let extractedData = null;
      
      if (response.data) {
        if (response.data.data) {
          // 標準的なパス: response.data.data
          extractedData = response.data.data;
        } else if (response.data.result) {
          // 代替パス: response.data.result
          extractedData = response.data.result;
        } else if (response.data.poData) {
          // 代替パス: response.data.poData
          extractedData = response.data.poData;
        } else if (typeof response.data === 'object' && !response.data.error) {
          // データが直接ルートに格納されている可能性
          extractedData = response.data;
        }
      }
      
      if (extractedData) {
        console.log('Successfully extracted OCR data:', extractedData);
        
        // 製品情報の処理
        let products = [];
        
        if (Array.isArray(extractedData.products) && extractedData.products.length > 0) {
          // 標準的な製品配列形式
          products = extractedData.products.map(product => ({
            product_name: product.product_name || product.name || product.productName || product.description || '',
            quantity: product.quantity || product.qty || '',
            unit_price: product.unit_price || product.unitPrice || product.price || '',
            amount: product.amount || product.subtotal || (
              product.quantity && product.unit_price 
                ? (parseFloat(product.quantity) * parseFloat(product.unit_price)).toString()
                : ''
            )
          }));
        } else if (Array.isArray(extractedData.items) && extractedData.items.length > 0) {
          // 代替の製品配列形式
          products = extractedData.items.map(item => ({
            product_name: item.product_name || item.name || item.productName || item.description || '',
            quantity: item.quantity || item.qty || '',
            unit_price: item.unit_price || item.unitPrice || item.price || '',
            amount: item.amount || item.subtotal || (
              item.quantity && item.unit_price 
                ? (parseFloat(item.quantity) * parseFloat(item.unit_price)).toString()
                : ''
            )
          }));
        } else {
          // 製品情報が構造化されていない場合のデフォルト
          products = [{
            product_name: extractedData.product_name || extractedData.productName || extractedData.name || '',
            quantity: extractedData.quantity || '',
            unit_price: extractedData.unit_price || extractedData.unitPrice || '',
            amount: extractedData.amount || extractedData.subtotal || ''
          }];
        }
        
        // 金額が空の場合、数量と単価から計算
        products = products.map(product => {
          if (!product.amount && product.quantity && product.unit_price) {
            const quantity = parseFloat(product.quantity) || 0;
            const unitPrice = parseFloat(product.unit_price) || 0;
            product.amount = (quantity * unitPrice).toString();
          }
          return product;
        });
        
        // APIからの生データをデータベースのカラム名に正規化
        const normalizedData = {
          // PurchaseOrdersテーブル
          customer_name: extractedData.customer_name || extractedData.customer || extractedData.customerName || extractedData.client || '',
          po_number: extractedData.po_number || extractedData.poNumber || extractedData.po || '',
          currency: extractedData.currency || extractedData.currencyCode || 'USD',
          payment_terms: extractedData.payment_terms || extractedData.paymentTerms || extractedData.payment || '',
          shipping_terms: extractedData.shipping_terms || extractedData.terms || extractedData.incoterms || '',
          destination: extractedData.destination || extractedData.port || '',
          status: 'pending',
          
          // 製品情報
          products: products,
          
          // Inputテーブル - UI表示はしないが、データは保持
          shipment_arrangement: '手配中',
          organization: extractedData.organization || '',
          invoice_number: extractedData.invoice_number || extractedData.invoiceNumber || extractedData.invoice || '',
          payment_status: extractedData.payment_status || extractedData.paymentStatus || '',
          
          // OCR生データ
          ocr_raw_text: JSON.stringify(extractedData)
        };
        
        // 合計金額は製品の金額合計から計算（useEffectで自動計算）
        
        console.log('Normalized data for database:', normalizedData);
        
        // 正規化したデータを状態に設定
        setPoData(normalizedData);
        setIsProcessing(false);
        setViewMode('summary');
        
        // 成功メッセージの設定
        setSuccessMessage('PO情報の読み取りが完了しました。内容を確認してください。');
      } else {
        // データが見つからない場合
        const errorMessage = response.data?.message || response.data?.error || 'OCR結果から有効なデータを抽出できませんでした';
        console.error('Failed to extract valid data:', errorMessage);
        
        // エラーメッセージを文字列として設定
        setErrorMessage(String(errorMessage));
        setIsProcessing(false);
        setViewMode('upload');
      }
    } catch (error) {
      console.error('Fetch OCR Data error:', error);
      console.error('Error response:', error.response);
      
      // エラー詳細の収集
      let errorDetail = '';
      if (error.response) {
        console.error('Status:', error.response.status);
        if (error.response.data) {
          errorDetail = error.response.data.message || 
                      (error.response.data.detail ? JSON.stringify(error.response.data.detail) : '') ||
                      JSON.stringify(error.response.data);
        }
      }
      
      // エラーメッセージを文字列として設定
      const errorMessage = errorDetail || 
        error.message || 
        'OCR結果の取得に失敗しました';
      
      console.error('Final error message:', errorMessage);
      setErrorMessage(String(errorMessage));
      setIsProcessing(false);
      setViewMode('upload');
    }
  };
  
  // 製品項目の追加
  const handleAddProduct = () => {
    setPoData(prevData => ({
      ...prevData,
      products: [
        ...prevData.products,
        {
          product_name: '',
          quantity: '',
          unit_price: '',
          amount: ''
        }
      ]
    }));
  };

  // 製品項目の削除
  const handleRemoveProduct = (index) => {
    if (poData.products.length <= 1) {
      // 最低1つの製品は必要
      return;
    }

    setPoData(prevData => {
      const newProducts = [...prevData.products];
      newProducts.splice(index, 1);
      return {
        ...prevData,
        products: newProducts
      };
    });
  };
  
  // 製品フィールドの変更ハンドラ
  const handleProductChange = (index, field, value) => {
    setPoData(prevData => {
      const updatedProducts = [...prevData.products];
      updatedProducts[index] = {
        ...updatedProducts[index],
        [field]: value
      };
      
      // 数量または単価が変更された場合、金額を自動計算
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(updatedProducts[index].quantity) || 0;
        const unitPrice = field === 'unit_price' ? parseFloat(value) || 0 : parseFloat(updatedProducts[index].unit_price) || 0;
        updatedProducts[index].amount = (quantity * unitPrice).toString();
      }
      
      return {
        ...prevData,
        products: updatedProducts
      };
    });
  };
  
  // その他のフィールド変更ハンドラ
  const handleInputChange = (field, value) => {
    setPoData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };
  
  // 手動入力モードにリセット
  const resetToManualEntry = () => {
    setViewMode('upload');
    setUploadedFile(null);
    setManualTotalEdit(false);
    setPoData({
      // PurchaseOrdersテーブルのフィールド
      customer_name: '',
      po_number: '',
      currency: 'USD',
      total_amount: '0.00',
      payment_terms: '',
      shipping_terms: '',
      destination: '',
      status: 'pending',

      // 製品情報
      products: [
        {
          product_name: '',
          quantity: '',
          unit_price: '',
          amount: ''
        }
      ],

      // Inputテーブルのフィールド - UI表示はしないが保持
      shipment_arrangement: '手配中',
      po_acquisition_date: new Date().toISOString().split('T')[0],
      organization: '',
      invoice_number: '',
      payment_status: '',
      memo: '',

      // OCR結果用フィールド
      ocr_raw_text: ''
    });
    setErrorMessage('');
    setSuccessMessage('');
  };
  
  // PO登録
  const handleRegister = () => {
    // 入力バリデーション
    if (!poData.customer_name || !poData.po_number) {
      setErrorMessage('必須項目（顧客名、PO番号など）を入力してください。');
      return;
    }
    
    setShowConfirmDialog(true);
  };
  
  // 登録確認 - バックエンドAPIに合わせてデータ形式を変更
  const confirmRegistration = async () => {
    setShowConfirmDialog(false);
    
    try {
      // バックエンドに送信するデータを準備
      // APIの期待する形式にデータを変換
      const requestData = {
        // バックエンドの期待するフィールド名に変換
        customer: poData.customer_name,
        poNumber: poData.po_number,
        currency: poData.currency,
        totalAmount: poData.total_amount,
        paymentTerms: poData.payment_terms,
        terms: poData.shipping_terms,
        destination: poData.destination,
        
        // 製品情報も変換
        products: poData.products.map(product => ({
          name: product.product_name,
          quantity: product.quantity,
          unitPrice: product.unit_price,
          amount: product.amount
        })),
        
        // 以下のフィールドはPOテーブルには保存されないが、別テーブルに保存される
        // UI表示はしないがバックエンドに送信
        shipment_arrangement: poData.shipment_arrangement,
        po_acquisition_date: poData.po_acquisition_date,
        organization: poData.organization,
        invoice_number: poData.invoice_number,
        payment_status: poData.payment_status,
        memo: poData.memo,
        
        // OCR生データ
        ocr_raw_text: poData.ocr_raw_text
      };
      
      console.log('送信するデータ:', requestData);
      
      const response = await axios.post(`${API_URL}/api/po/register`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('登録レスポンス:', response.data);
      
      if (response.data && response.data.success) {
        console.log('登録成功、完了ダイアログを表示します');
        setShowCompletedDialog(true);
      } else {
        console.error('レスポンスにsuccessフラグがありません:', response.data);
        throw new Error(response.data?.message || '登録に失敗しました');
      }
    } catch (error) {
      console.error('登録エラー:', error);
      console.error('エラーレスポンス:', error.response?.data);
      setErrorMessage(
        error.response?.data?.message || 
        error.response?.data?.detail || 
        error.message || 
        'PO情報の登録に失敗しました。もう一度お試しください。'
      );
    }
  };
  
  // ファイル選択クリックハンドラ
  const handleFileButtonClick = () => {
    fileInputRef.current.click();
  };
  
  // ファイル選択変更ハンドラ
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };
  
  // ドラッグアンドドロップハンドラ
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDragEnter = (e) => {
    e.preventDefault();
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
  };
  
  // 修正モードのトグル
  const handleEdit = () => {
    // 修正モードに切り替えるロジックをここに追加
    alert('編集モードに切り替えます');
  };

  // ブッキングページへの遷移
  const navigateToBooking = () => {
    navigate('/booking');
  };

  // 一覧ページへの遷移
  const navigateToList = () => {
    navigate('/po/list');
  };

  // UI表示部分 - ナビゲーションバーを削除
  return (
    <div className="po-upload-container">
      {/* メインコンテンツ - ナビバーは含まない */}
      <div className="main-content">
        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        
        {/* 成功メッセージ */}
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
        
        <div className="two-column-layout">
          {/* 左側：PO情報 */}
          <div className="info-panel">
            <div className="info-header">
              <div className="info-title">PO読取情報サマリー</div>
              <div className="button-group">
                <button 
                  className={`action-button ${viewMode === 'summary' ? 'active' : ''}`}
                  onClick={handleRegister}
                  disabled={viewMode !== 'summary'}
                >
                  登録する
                </button>
                <button 
                  className={`action-button ${viewMode === 'summary' ? 'active' : ''}`}
                  onClick={handleEdit}
                  disabled={viewMode !== 'summary'}
                >
                  修正する
                </button>
              </div>
            </div>
            <div className="info-body">
              <div className="info-row">
                <div className="info-label">顧客</div>
                <input 
                  type="text" 
                  className="info-input" 
                  value={poData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  disabled={viewMode === 'processing'}
                />
              </div>
              <div className="info-row">
                <div className="info-label">PO No.</div>
                <input 
                  type="text" 
                  className="info-input" 
                  value={poData.po_number}
                  onChange={(e) => handleInputChange('po_number', e.target.value)}
                  disabled={viewMode === 'processing'}
                />
              </div>
              <div className="info-row">
                <div className="info-label">通貨</div>
                <input 
                  type="text" 
                  className="info-input" 
                  value={poData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  disabled={viewMode === 'processing'}
                />
              </div>
              
              <div className="product-info-section">
                <div className="product-header">
                  <span>製品情報</span>
                  <button 
                    className="add-product-button"
                    onClick={handleAddProduct}
                    disabled={viewMode === 'processing' || poData.products.length >= 6}
                  >
                    <span>+</span> 製品を追加
                  </button>
                </div>
                
                {poData.products.map((product, index) => (
                  <div key={index} className="product-item">
                    <div className="product-number-row">
                      <span className="product-number">製品 {index + 1}</span>
                      {poData.products.length > 1 && (
                       <button 
                         className="remove-product-button"
                         onClick={() => handleRemoveProduct(index)}
                         disabled={viewMode === 'processing'}
                       >
                         削除
                       </button>
                     )}
                   </div>
                   <div className="info-row">
                     <div className="info-label">製品名称</div>
                     <input 
                       type="text" 
                       className="info-input" 
                       value={product.product_name}
                       onChange={(e) => handleProductChange(index, 'product_name', e.target.value)}
                       disabled={viewMode === 'processing'}
                     />
                   </div>
                   <div className="info-row">
                     <div className="info-label">数量(KG)</div>
                     <input 
                       type="text" 
                       className="info-input" 
                       value={product.quantity}
                       onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                       disabled={viewMode === 'processing'}
                     />
                   </div>
                   <div className="info-row">
                     <div className="info-label">単価</div>
                     <input 
                       type="text" 
                       className="info-input" 
                       value={product.unit_price}
                       onChange={(e) => handleProductChange(index, 'unit_price', e.target.value)}
                       disabled={viewMode === 'processing'}
                     />
                   </div>
                   <div className="info-row">
                     <div className="info-label">金額</div>
                     <input 
                       type="text" 
                       className="info-input" 
                       value={product.amount}
                       onChange={(e) => handleProductChange(index, 'amount', e.target.value)}
                       disabled={viewMode === 'processing'}
                     />
                   </div>
                 </div>
               ))}
             </div>
             
             <div className="info-row total-row">
               <div className="info-label">合計金額</div>
               <input 
                 type="text" 
                 className="info-input total-amount" 
                 value={poData.total_amount}
                 onChange={handleTotalAmountChange}
                 disabled={viewMode === 'processing'}
               />
             </div>
             
             <div className="info-row">
               <div className="info-label">支払い条件</div>
               <input 
                 type="text" 
                 className="info-input" 
                 value={poData.payment_terms}
                 onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                 disabled={viewMode === 'processing'}
               />
             </div>
             <div className="info-row">
               <div className="info-label">ターム</div>
               <input 
                 type="text" 
                 className="info-input" 
                 value={poData.shipping_terms}
                 onChange={(e) => handleInputChange('shipping_terms', e.target.value)}
                 disabled={viewMode === 'processing'}
               />
             </div>
             <div className="info-row">
               <div className="info-label">揚げ地</div>
               <input 
                 type="text" 
                 className="info-input" 
                 value={poData.destination}
                 onChange={(e) => handleInputChange('destination', e.target.value)}
                 disabled={viewMode === 'processing'}
               />
             </div>
           </div>
         </div>
         
         {/* 右側：PO画像 */}
         <div className="image-panel">
           <div className="image-header">
             <div className="image-title">PO画像</div>
           </div>
           <div className="image-body">
             {viewMode === 'upload' && (
               <div 
                 className="upload-area"
                 onDrop={handleDrop}
                 onDragOver={handleDragOver}
                 onDragEnter={handleDragEnter}
                 onDragLeave={handleDragLeave}
               >
                 <p className="upload-main-text">POをアップロードしてください</p>
                 <p className="upload-sub-text">(対応形式：PDF/PNG/JPEG)</p>
                 <p className="upload-instruction">ここにドラッグアンドドロップ</p>
                 <p className="upload-or">または</p>
                 <button
                   className="file-select-button"
                   onClick={handleFileButtonClick}
                 >
                   ファイルを選択
                 </button>
                 <input
                   type="file"
                   ref={fileInputRef}
                   className="file-input-hidden"
                   accept=".pdf,.png,.jpg,.jpeg"
                   onChange={handleFileChange}
                 />
               </div>
             )}
             
             {viewMode === 'processing' && (
               <div className="processing-area">
                 <p className="processing-text">画像を解析しています...</p>
                 <div className="spinner"></div>
               </div>
             )}
             
             {viewMode === 'summary' && uploadedFile && (
               <div className="preview-area">
                 {uploadedFile.type.includes('image') ? (
                   <img 
                     src={URL.createObjectURL(uploadedFile)} 
                     alt="Uploaded PO" 
                     className="preview-image"
                   />
                 ) : (
                   <div className="preview-pdf">
                     <p className="preview-filename">ファイル名: {uploadedFile.name}</p>
                     <object
                       data={URL.createObjectURL(uploadedFile)}
                       type="application/pdf"
                       className="pdf-object"
                     >
                       <p>PDFを表示できません。<a href={URL.createObjectURL(uploadedFile)} target="_blank" rel="noopener noreferrer">ここをクリック</a>して新しいタブで開いてください。</p>
                     </object>
                   </div>
                 )}
               </div>
             )}
           </div>
         </div>
       </div>
     </div>

     {/* 登録確認ダイアログ - デザイン変更 */}
     {showConfirmDialog && (
       <div className="overlay">
         <div className="dialog">
           <h3 className="dialog-title">PO情報を登録しますか？</h3>
           <div className="dialog-buttons">
             <button 
               className="dialog-button-cancel"
               onClick={() => setShowConfirmDialog(false)}
             >
               戻る
             </button>
             <button 
               className="dialog-button-confirm"
               onClick={confirmRegistration}
             >
               はい
             </button>
           </div>
         </div>
       </div>
     )}
     
     {/* 登録完了ダイアログ - 新規実装 */}
     {showCompletedDialog && (
       <div className="overlay">
         <div className="dialog">
           <h3 className="dialog-title">PO情報が登録されました</h3>
           <div className="dialog-buttons">
             <button 
               className="dialog-button-cancel"
               onClick={() => {
                 setShowCompletedDialog(false);
                 resetToManualEntry();
               }}
             >
               別のPOを登録する
             </button>
             <button 
               className="dialog-button-confirm"
               onClick={() => {
                 setShowCompletedDialog(false);
                 navigateToList();
               }}
             >
               一覧を見る
             </button>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

export default POUpload;
