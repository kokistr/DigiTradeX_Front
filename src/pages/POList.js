// src/pages/POList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const POList = () => {
  const navigate = useNavigate();
  
  const [poList, setPOList] = useState([]);
  const [originalData, setOriginalData] = useState([]); // 元のデータを保存
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    customer_name: '',
    po_number: '',
    manager: '',
    organization: ''
  });
  
  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // 削除機能用の状態
  const [selectedItems, setSelectedItems] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // PO一覧データの取得 (初期データロード用)
  const fetchPOList = async () => {
    try {
      setIsLoading(true);
      
      console.log('PO一覧データ取得開始');
      
      const response = await axios.get(`${API_URL}/api/po/list`, { 
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('PO一覧データのレスポンス:', response.data);
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        console.log('取得したPOリスト:', response.data.data);
        const data = response.data.data;
        setPOList(data);
        setOriginalData(data); // 元のデータを保存
        setCurrentPage(1); // データ取得時にページを1に戻す
        // 選択状態をリセット
        setSelectedItems({});
      } else {
        console.error('不正なレスポンス形式:', response.data);
        throw new Error('サーバーから正しいデータ形式が返されませんでした');
      }
    } catch (error) {
      console.error('List fetch error:', error);
      setError('PO一覧の取得に失敗しました: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 初期データ読み込み
  useEffect(() => {
    fetchPOList();
  }, []); 
  
  // 出荷手配に応じた背景色クラスを取得
  const getStatusClass = (status) => {
    switch (status) {
      case '手配前':
        return ''; // デフォルト色
      case '手配中':
        return 'bg-red-100';
      case '手配済':
        return 'bg-blue-100';
      case '計上済':
        return 'bg-gray-200';
      default:
        return '';
    }
  };
  
  // 出荷手配変更ハンドラ
  const handleStatusChange = async (id, newStatus) => {
    try {
      
      console.log(`出荷手配更新: ID=${id}, 新出荷手配=${newStatus}`);
      
      await axios.patch(
        `${API_URL}/api/po/${id}/status`, 
        { status: newStatus }, 
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 状態を更新
      const updatedList = poList.map(po => 
        po.id === id ? { ...po, status: newStatus } : po
      );
      setPOList(updatedList);
      
      // 元のデータも更新
      setOriginalData(originalData.map(po => 
        po.id === id ? { ...po, status: newStatus } : po
      ));
    } catch (error) {
      console.error('Status update error:', error);
      setError('出荷手配更新に失敗しました: ' + (error.response?.data?.detail || error.message));
    }
  };
  
  // 行の展開・折りたたみを切り替え
  const toggleRowExpand = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // フィルター変更時の処理
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };
  
  // フィルターリセット
  const resetFilters = () => {
    setFilters({
      status: '',
      customer_name: '',
      po_number: '',
      manager: '',
      organization: ''
    });
    setPOList(originalData);
    setCurrentPage(1); // ページを1に戻す
  };
  
  // フィルター適用
  const applyFilters = () => {
    setIsLoading(true);
    
    console.log('ローカルフィルタリング適用:', filters);
    
    // フィルタリング条件に基づいてデータをフィルタリング
    const filteredData = originalData.filter(po => {
      // 出荷手配フィルター
      if (filters.status && po.status !== filters.status) {
        return false;
      }
      
      // PONoフィルター
      if (filters.po_number && 
          !String(po.poNumber || '').toLowerCase().includes(filters.po_number.toLowerCase())) {
        return false;
      }
      
      // 顧客フィルター
      if (filters.customer_name && 
          !String(po.customer || '').toLowerCase().includes(filters.customer_name.toLowerCase())) {
        return false;
      }
      
      // 担当者フィルター
      if (filters.manager && 
          !String(po.manager || '').toLowerCase().includes(filters.manager.toLowerCase())) {
        return false;
      }
      
      // 組織フィルター
      if (filters.organization && 
          !String(po.organization || '').toLowerCase().includes(filters.organization.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    console.log('フィルター結果:', filteredData.length);
    setPOList(filteredData);
    setCurrentPage(1); // フィルター適用時にページを1に戻す
    setIsLoading(false);
  };
  
  // メモ更新ハンドラ
  const handleMemoUpdate = async (id, memo) => {
    try {
      
      await axios.patch(
        `${API_URL}/api/po/${id}/memo`, 
        { memo }, 
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 状態を更新
      const updatedList = poList.map(po => 
        po.id === id ? { ...po, memo } : po
      );
      setPOList(updatedList);
      
      // 元のデータも更新
      setOriginalData(originalData.map(po => 
        po.id === id ? { ...po, memo } : po
      ));
    } catch (error) {
      console.error('Memo update error:', error);
      setError('メモの更新に失敗しました: ' + (error.response?.data?.detail || error.message));
    }
  };
  
  // 現在のページに表示するデータ取得
  const getCurrentItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return poList.slice(indexOfFirstItem, indexOfLastItem);
  };
  
  // ページを変更する
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // 総ページ数
  const totalPages = Math.ceil(poList.length / itemsPerPage);
  
  // チェックボックスの状態更新
  const handleCheckboxChange = (id) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // 選択したアイテムすべてのチェックを外す
  const clearSelection = () => {
    setSelectedItems({});
  };
  
  // 選択したPOの数を取得
  const getSelectedCount = () => {
    return Object.values(selectedItems).filter(v => v).length;
  };
  
  // 削除確認ダイアログを表示
  const showDeleteDialog = () => {
    if (getSelectedCount() > 0) {
      setShowDeleteConfirm(true);
    } else {
      setError('削除するPOを選択してください');
    }
  };
  
  // 削除処理
  const deleteSelectedItems = async () => {
    try {
      setIsDeleting(true);
      
      // 選択されたIDのリストを作成
      const idsToDelete = Object.entries(selectedItems)
        .filter(([_, isSelected]) => isSelected)
        .map(([id, _]) => id);
      
      console.log('削除するPO:', idsToDelete);
      
      // POを削除
      await axios.delete(`${API_URL}/api/po/delete`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: { ids: idsToDelete }
      });
      
      // データを再取得して反映
      await fetchPOList();
      setShowDeleteConfirm(false);
      
    } catch (error) {
      console.error('Delete error:', error);
      setError('POの削除に失敗しました: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  // ページネーションコンポーネント
  const Pagination = () => {
    const pageNumbers = [];
    
    // ページ数が多い場合に表示するページ番号を制限
    const maxPageButtons = 5;
    let startPage, endPage;
    
    if (totalPages <= maxPageButtons) {
      // 総ページ数が少ない場合はすべて表示
      startPage = 1;
      endPage = totalPages;
    } else {
      // 現在のページの前後に表示するページ数
      const maxPagesBeforeCurrentPage = Math.floor(maxPageButtons / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxPageButtons / 2) - 1;
      
      if (currentPage <= maxPagesBeforeCurrentPage) {
        // 現在のページが始めの方の場合
        startPage = 1;
        endPage = maxPageButtons;
      } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
        // 現在のページが終わりの方の場合
        startPage = totalPages - maxPageButtons + 1;
        endPage = totalPages;
      } else {
        // 現在のページが中間の場合
        startPage = currentPage - maxPagesBeforeCurrentPage;
        endPage = currentPage + maxPagesAfterCurrentPage;
      }
    }
    
    // ページ番号の配列を生成
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="flex justify-center mt-4">
        <ul className="inline-flex items-center -space-x-px">
          {/* 「前へ」ボタン */}
          <li>
            <button
              onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
              disabled={currentPage === 1}
              className={`block px-3 py-2 ml-0 leading-tight ${
                currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-500 hover:text-blue-600'
              } bg-white border border-gray-300 rounded-l-lg`}
            >
              前へ
            </button>
          </li>
          
          {/* ページ番号 */}
          {pageNumbers.map(number => (
            <li key={number}>
              <button
                onClick={() => paginate(number)}
                className={`px-3 py-2 leading-tight border border-gray-300 ${
                  currentPage === number
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-blue-600'
                }`}
              >
                {number}
              </button>
            </li>
          ))}
          
          {/* 「次へ」ボタン */}
          <li>
            <button
              onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`block px-3 py-2 leading-tight ${
                currentPage === totalPages || totalPages === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-500 hover:text-blue-600'
              } bg-white border border-gray-300 rounded-r-lg`}
            >
              次へ
            </button>
          </li>
        </ul>
      </div>
    );
  };
  
  // 削除確認モーダル
  const DeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;
    
    const selectedCount = getSelectedCount();
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-bold">削除の確認</h3>
          </div>
          
          <div className="mb-6">
            <p className="mb-2">選択した{selectedCount}件のPOをデータベースから完全に削除します。</p>
            <p className="text-red-600 font-bold">この操作は取り消せません。</p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              disabled={isDeleting}
            >
              キャンセル
            </button>
            <button
              onClick={deleteSelectedItems}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  削除中...
                </>
              ) : (
                '削除する'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <div className="bg-blue-100 p-2 mb-4">
        <h2 className="font-medium">一覧</h2>
      </div>
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError('')}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}
      
      {/* フィルターセクション - 横一列に配置 */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">出荷手配:</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">すべて</option>
              <option value="手配前">手配前</option>
              <option value="手配中">手配中</option>
              <option value="手配済">手配済</option>
              <option value="計上済">計上済</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">担当者:</label>
            <input
              type="text"
              name="manager"
              value={filters.manager}
              onChange={handleFilterChange}
              placeholder="担当者名で検索"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">組織:</label>
            <input
              type="text"
              name="organization"
              value={filters.organization || ''}
              onChange={handleFilterChange}
              placeholder="組織で検索"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">PONo:</label>
            <input
              type="text"
              name="po_number"
              value={filters.po_number}
              onChange={handleFilterChange}
              placeholder="PONoで検索"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">顧客:</label>
            <input
              type="text"
              name="customer_name"
              value={filters.customer_name}
              onChange={handleFilterChange}
              placeholder="顧客で検索"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>    
          
          <button 
            onClick={applyFilters} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            検索
          </button>
          
          <button 
            onClick={resetFilters} 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            リセット
          </button>
        </div>
        
        {/* 表示件数と削除ボタン */}
        <div className="mt-4 flex justify-between items-center">
          <p className="text-xs text-gray-500">表示件数: {poList.length} / 全{originalData.length}件</p>
          
          <div className="flex gap-2 items-center">
            {getSelectedCount() > 0 && (
              <span className="text-xs text-gray-600 mr-2">{getSelectedCount()}件選択中</span>
            )}
            <button 
              onClick={showDeleteDialog}
              className={`px-3 py-1 rounded text-white text-sm ${
                getSelectedCount() > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'
              }`}
              disabled={getSelectedCount() === 0}
            >
              選択したPOを削除
            </button>
            {getSelectedCount() > 0 && (
              <button 
                onClick={clearSelection}
                className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm"
              >
                選択解除
              </button>
            )}
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 border-t-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>データを読み込み中...</p>
        </div>
      ) : poList.length === 0 ? (
        <div className="text-center py-10">
          <p>登録されたPOはありません</p>
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs uppercase bg-gray-200">
                <tr>
                  <th className="border p-2 w-10">
                    {/* 全選択チェックボックスはここに追加可能 */}
                  </th>
                  <th className="border p-2"></th>
                  <th className="border p-2">出荷手配</th>
                  <th className="border p-2">担当者</th>
                  <th className="border p-2">組織</th>
                  <th className="border p-2">INV No.</th>
                  <th className="border p-2">PO No.</th>
                  <th className="border p-2">顧客</th>
                  <th className="border p-2">CUT</th>
                  <th className="border p-2">ETD</th>
                  <th className="border p-2">揚げ地</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentItems().map((po) => (
                  <React.Fragment key={po.id}>
                    <tr className={getStatusClass(po.status)}>
                      <td className="border p-2">
                        <div className="flex items-center">
                          <input
                            id={`checkbox-${po.id}`}
                            type="checkbox"
                            checked={!!selectedItems[po.id]}
                            onChange={() => handleCheckboxChange(po.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </td>
                      <td className="border p-2">
                        <button 
                          onClick={() => toggleRowExpand(po.id)} 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {expandedRows[po.id] ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="border p-2">
                        <select
                          value={po.status || '手配前'}
                          onChange={(e) => handleStatusChange(po.id, e.target.value)}
                          className="border rounded p-1 w-full"
                        >
                          <option value="手配前">手配前</option>
                          <option value="手配中">手配中</option>
                          <option value="手配済">手配済</option>
                          <option value="計上済">計上済</option>
                        </select>
                      </td>
                      <td className="border p-2">{po.manager || ""}</td>
                      <td className="border p-2">{po.organization || ""}</td>
                      <td className="border p-2">{po.invoiceNumber || ""}</td>
                      <td className="border p-2">{po.poNumber || ""}</td>
                      <td className="border p-2">{po.customer || ""}</td>
                      <td className="border p-2">{po.cutOffDate || ""}</td>
                      <td className="border p-2">{po.etd || ""}</td>
                      <td className="border p-2">{po.destination || ""}</td>
                    </tr>
                    {expandedRows[po.id] && (
                      <tr className={`${getStatusClass(po.status)} text-xs`}>
                        <td colSpan="11" className="border p-2">
                          <div className="grid grid-cols-4 gap-2">
                            <div className="mb-2">
                              <div className="font-bold">取得日:</div>
                              <div>{po.acquisitionDate || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">伝票:</div>
                              <div>{po.invoice || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">入金:</div>
                              <div>{po.payment || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">BKG:</div>
                              <div>{po.booking || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">商品名称:</div>
                              <div>{po.productName || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">数量(kg):</div>
                              <div>{po.quantity || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">単価:</div>
                              <div>{po.unitPrice || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">金額:</div>
                              <div>{po.amount || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">通貨:</div>
                              <div>{po.currency || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">支払条件:</div>
                              <div>{po.paymentTerms || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">ターム:</div>
                              <div>{po.terms || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">経由地:</div>
                              <div>{po.transitPoint || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">ETA:</div>
                              <div>{po.eta || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">BKG No.:</div>
                              <div>{po.bookingNumber || ""}</div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">船名:</div>
                             <div>{po.vesselName || ""}</div>
                           </div>
                           <div className="mb-2">
                             <div className="font-bold">Voy No.:</div>
                             <div>{po.voyageNumber || ""}</div>
                           </div>
                           <div className="mb-2">
                             <div className="font-bold">コンテナ:</div>
                             <div>{po.containerInfo || ""}</div>
                           </div>
                           <div className="mb-2 col-span-4">
                             <div className="font-bold">メモ:</div>
                             <div 
                               contentEditable={true}
                               onBlur={(e) => handleMemoUpdate(po.id, e.target.textContent)}
                               className="p-1 border min-h-[40px]"
                             >
                               {po.memo || ""}
                             </div>
                           </div>
                         </div>
                       </td>
                     </tr>
                   )}
                 </React.Fragment>
               ))}
             </tbody>
           </table>
         </div>
         
         {/* ページネーション */}
         {totalPages > 1 && <Pagination />}
       </div>
     )}
     
     {/* 削除確認モーダル */}
     <DeleteConfirmModal />
   </div>
 );
};

export default POList;
