// POUpload.js
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
    currency: '',  
    total_amount: 0,
    payment_terms: '',
    shipping_terms: '',
    destination: '',
    status: 'pending',

    // 製品情報の配列（複数製品に対応）
    products: [
      {
        product_name: '',
        quantity: 0,
        unit_price: 0,
        amount: 0
      }
    ],

    // Inputテーブルのフィールド（UI表示しないが保持）
    shipment_arrangement: '手配前',
    po_acquisition_date: new Date().toISOString().split('T')[0],
    organization: '',
    invoice_number: '',
    payment_status: '',
    booking_number: '',
    memo: '',

    // OCR結果用フィールド（データベース上はraw_text）
    raw_text: ''
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
        total_amount: total
      }));
    }
  }, [poData.products, manualTotalEdit]);

  // 合計金額の手動編集ハンドラ
  const handleTotalAmountChange = (e) => {
    setManualTotalEdit(true); // 手動編集モードをオン
    setPoData(prevData => ({
      ...prevData,
      total_amount: parseFloat(e.target.value) || 0
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
      
      // local_kwパラメータを追加（FormDataに直接追加）
      formData.append('local_kw', 'true');
      
      // デバッグログの拡張
      console.log('API_URL:', API_URL);
      console.log('Uploading file:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      console.log('Full upload URL:', `${API_URL}/api/ocr/upload`);
      
      // FormDataの内容を確認
      console.log('FormData has file:', formData.has('file'));
      console.log('FormData has local_kw:', formData.has('local_kw'));
      
      // ヘッダーとパラメータの設定を修正
      const response = await axios.post(`${API_URL}/api/ocr/upload`, formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data'  // Content-Type を明示的に指定
        },
        // タイムアウト設定を長く
        timeout: 120000, // 120秒に延長
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
                  quantity: 5000,
                  unit_price: 2.7,
                  amount: 13500
                },
                {
                  product_name: 'Product C',
                  quantity: 4000,
                  unit_price: 3.4,
                  amount: 13600
                },
                {
                  product_name: 'Product D',
                  quantity: 3000,
                  unit_price: 3.05,
                  amount: 9150
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
              total_amount: 13500 + 13600 + 9150
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
  const checkOCRStatus = async (ocrId, attempt = 1, maxAttempts = 30) => {
    try {
      console.log(`ステータス確認 (${attempt}/${maxAttempts}): ${ocrId}`);
      
      if (attempt > maxAttempts) {
        throw new Error('OCR処理がタイムアウトしました');
      }
      
      const response = await axios.get(`${API_URL}/api/ocr/status/${ocrId}`);
      console.log('ステータス結果:', response.data);
      console.log('ステータス結果 (詳細):', JSON.stringify(response.data, null, 2));
      
      if (response.data.status === 'completed') {
        // 処理完了 - 結果を取得
        fetchOCRResults(ocrId);
      } else if (response.data.status === 'failed' || response.data.status === 'error') {
        // 処理失敗 - それでも結果を取得（デモデータがあるため）
        fetchOCRResults(ocrId);
      } else {
        // 処理中 - 2秒後に再確認
        setTimeout(() => checkOCRStatus(ocrId, attempt + 1, maxAttempts), 2000);
      }
    } catch (error) {
      console.error('ステータス確認エラー:', error);
      // エラー時もOCR結果を取得しようとする（デモデータがあるため）
      fetchOCRResults(ocrId);
    }
  };
  
  // OCR結果データの取得
  const fetchOCRResults = async (ocrId) => {
    try {
      console.log('Fetching OCR data for ID:', ocrId);
      
      const response = await axios.get(`${API_URL}/api/ocr/extract/${ocrId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // デバッグ用ログを追加
      console.log('OCR Data response:', response.data);
      console.log('OCR Data response (詳細):', JSON.stringify(response.data, null, 2));
      
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
            quantity: parseInt(product.quantity || product.qty, 10) || 0,
            unit_price: parseFloat(product.unit_price || product.unitPrice || product.price) || 0,
            amount: parseFloat(product.amount || product.subtotal) || 0
          }));
        } else if (Array.isArray(extractedData.items) && extractedData.items.length > 0) {
          // 代替の製品配列形式
          products = extractedData.items.map(item => ({
            product_name: item.product_name || item.name || item.productName || item.description || '',
            quantity: parseInt(item.quantity || item.qty, 10) || 0,
            unit_price: parseFloat(item.unit_price || item.unitPrice || item.price) || 0,
            amount: parseFloat(item.amount || item.subtotal) || 0
          }));
        } else {
          // 製品情報が構造化されていない場合のデフォルト
          products = [{
            product_name: extractedData.product_name || extractedData.productName || extractedData.name || '',
            quantity: parseInt(extractedData.quantity, 10) || 0,
            unit_price: parseFloat(extractedData.unit_price || extractedData.unitPrice) || 0,
            amount: parseFloat(extractedData.amount || extractedData.subtotal) || 0,
          }];
        }
        
        // 金額が空の場合、数量と単価から計算
        products = products.map(product => {
          if (!product.amount && product.quantity && product.unit_price) {
            const quantity = product.quantity;
            const unitPrice = product.unit_price;
            product.amount = quantity * unitPrice;
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
          booking_number: extractedData.booking_number || '',
          
          // OCR生データ - データベースのraw_textに対応
          raw_text: JSON.stringify(extractedData)
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
          quantity: 0,
          unit_price: 0,
          amount: 0
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
        [field]: field === 'quantity' ? parseInt(value, 10) || 0 : 
                field === 'product_name' ? value : parseFloat(value) || 0
      };
      
      // 数量または単価が変更された場合、金額を自動計算
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = updatedProducts[index].quantity;
        const unitPrice = updatedProducts[index].unit_price;
        updatedProducts[index].amount = quantity * unitPrice;
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
      total_amount: 0,
      payment_terms: '',
      shipping_terms: '',
      destination: '',
      status: 'pending',

      // 製品情報
      products: [
        {
          product_name: '',
          quantity: 0,
          unit_price: 0,
          amount: 0
        }
      ],

      // Inputテーブルのフィールド - UI表示はしないが保持
      shipment_arrangement: '手配前',
      po_acquisition_date: new Date().toISOString().split('T')[0],
      organization: '',
      invoice_number: '',
      payment_status: '',
      booking_number: '',
      memo: '',

      // OCR結果用フィールド
      raw_text: ''
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
        // モデルのフィールド名に合わせる
        customer_name: poData.customer_name,
        po_number: poData.po_number,
        currency: poData.currency,
        total_amount: poData.total_amount,
        payment_terms: poData.payment_terms,
        shipping_terms: poData.shipping_terms,
        destination: poData.destination,
        
        // 製品情報も変換 - 重要: products配列を使用（バックエンドはproductsを期待）
        products: poData.products.map(product => ({
          product_name: product.product_name,
          quantity: product.quantity,
          unit_price: product.unit_price,
          subtotal: product.amount  // フロントエンド側はamountを使用、バックエンドはsubtotalを期待
        })),
        
        // 以下のフィールドはPOテーブルには保存されないが、別テーブルに保存される
        // UI表示はしないがバックエンドに送信
        shipment_arrangement: poData.shipment_arrangement || "手配前",
        po_acquisition_date: poData.po_acquisition_date || new Date().toISOString().split('T')[0],
        organization: poData.organization || "",
        invoice_number: poData.invoice_number || "",
        payment_status: poData.payment_status || "",
        booking_number: poData.booking_number || "",
        memo: poData.memo || "",
        
        // OCR生データ - データベースのraw_textに対応
        raw_text: poData.raw_text || ""
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
      } else if (response.data && response.data.id) {
        // IDが返ってきたら成功とみなす
        console.log('登録成功（IDあり）、完了ダイアログを表示します');
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
                       value={product.quantity.toString()} // 数値型を文字列に変換
                       onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                       disabled={viewMode === 'processing'}
                     />
                   </div>
                   <div className="info-row">
                     <div className="info-label">単価</div>
                     <input 
                       type="text" 
                       className="info-input" 
                       value={product.unit_price.toString()} // 数値型を文字列に変換
                       onChange={(e) => handleProductChange(index, 'unit_price', e.target.value)}
                       disabled={viewMode === 'processing'}
                     />
                   </div>
                   <div className="info-row">
                     <div className="info-label">金額</div>
                     <input 
                       type="text" 
                       className="info-input" 
                       value={product.amount.toString()} // 数値型を文字列に変換
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
                 value={poData.total_amount.toString()} // 数値型を文字列に変換
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
{/*
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
*/}

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
                    <div className="pdf-link-container">
                      <p>PDFをアップロードしました。</p>
                      <button
                        className="pdf-preview-button"
                        onClick={() => window.open(URL.createObjectURL(uploadedFile), '_blank')}
                      >
                        PDFを別ウィンドウで開く
                      </button>
                    </div>
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
