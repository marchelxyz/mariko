import { useState, useEffect } from 'react';
import { HallScheme, TablePosition, TableBundle } from '@/types/booking';

interface HallSchemeViewerProps {
  hallSchemes: HallScheme[];
  selectedTableIds?: number[];
  availableTableIds?: number[];
  tableBundles?: TableBundle[] | number[][]; // Комбинации столов для подсветки
  onTableSelect?: (tableId: number) => void;
  onBundleSelect?: (tableIds: number[]) => void; // Обработчик выбора bundle
  className?: string;
}

export default function HallSchemeViewer({
  hallSchemes,
  selectedTableIds = [],
  availableTableIds = [],
  tableBundles = [],
  onTableSelect,
  onBundleSelect,
  className = '',
}: HallSchemeViewerProps) {
  const [selectedHall, setSelectedHall] = useState<HallScheme | null>(
    hallSchemes.length > 0 ? hallSchemes[0] : null
  );

  useEffect(() => {
    if (hallSchemes.length > 0 && !selectedHall) {
      setSelectedHall(hallSchemes[0]);
    }
  }, [hallSchemes, selectedHall]);

  if (!hallSchemes || hallSchemes.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p>Схемы залов не доступны для этого ресторана</p>
      </div>
    );
  }

  const handleTableClick = (tableId: number) => {
    if (onTableSelect) {
      onTableSelect(tableId);
    }
  };

  // Нормализуем bundles: преобразуем number[][] в TableBundle[]
  const normalizedBundles: TableBundle[] = Array.isArray(tableBundles) && tableBundles.length > 0
    ? tableBundles.map(bundle => {
        // Если bundle - это массив чисел (number[]), преобразуем в TableBundle
        if (Array.isArray(bundle) && bundle.length > 0 && typeof bundle[0] === 'number') {
          return { tables: bundle as number[] };
        }
        // Если bundle уже является объектом TableBundle, возвращаем как есть
        return bundle as TableBundle;
      })
    : [];

  // Проверяем, входит ли стол в какой-либо bundle
  const getTableBundle = (tableId: number): TableBundle | null => {
    return normalizedBundles.find(bundle => bundle.tables.includes(tableId)) || null;
  };

  // Проверяем, все ли столы из bundle выбраны
  const isBundleFullySelected = (bundle: TableBundle): boolean => {
    return bundle.tables.every(tableId => selectedTableIds.includes(tableId));
  };

  // Проверяем, все ли столы из bundle доступны
  const isBundleAvailable = (bundle: TableBundle): boolean => {
    if (availableTableIds.length === 0) return true;
    return bundle.tables.every(tableId => availableTableIds.includes(tableId));
  };

  const getTableStatus = (tableId: number): 'available' | 'selected' | 'unavailable' | 'in-bundle' => {
    if (selectedTableIds.includes(tableId)) {
      return 'selected';
    }
    
    const bundle = getTableBundle(tableId);
    if (bundle && isBundleAvailable(bundle)) {
      return 'in-bundle';
    }
    
    if (availableTableIds.length > 0 && !availableTableIds.includes(tableId)) {
      return 'unavailable';
    }
    return 'available';
  };

  const handleBundleClick = (bundle: TableBundle) => {
    if (onBundleSelect && isBundleAvailable(bundle)) {
      onBundleSelect(bundle.tables);
    } else if (onTableSelect) {
      // Если нет обработчика bundle, выбираем первый стол из bundle
      bundle.tables.forEach(tableId => {
        if (availableTableIds.length === 0 || availableTableIds.includes(tableId)) {
          onTableSelect(tableId);
        }
      });
    }
  };

  const renderTable = (table: TablePosition) => {
    const status = getTableStatus(table.tableId);
    const bundle = getTableBundle(table.tableId);
    const isClickable = onTableSelect && (status === 'available' || status === 'selected' || status === 'in-bundle');

    const baseStyles = 'absolute flex items-center justify-center text-xs font-medium transition-all cursor-pointer';
    const statusStyles = {
      available: 'bg-green-100 border-2 border-green-400 text-green-800 hover:bg-green-200 hover:border-green-500',
      selected: 'bg-primary border-2 border-primary-dark text-text-secondary shadow-lg scale-110',
      unavailable: 'bg-gray-100 border-2 border-gray-300 text-gray-400 cursor-not-allowed opacity-50',
      'in-bundle': 'bg-blue-100 border-2 border-blue-400 text-blue-800 hover:bg-blue-200 hover:border-blue-500 ring-2 ring-blue-300 ring-opacity-50',
    };

    const shapeStyles = table.shape === 'rectangle' && table.width && table.height
      ? { width: `${table.width}px`, height: `${table.height}px` }
      : table.shape === 'circle' && table.width
      ? { width: `${table.width}px`, height: `${table.width}px`, borderRadius: '50%' }
      : { width: '40px', height: '40px', borderRadius: '50%' };

    const bundleInfo = bundle && isBundleAvailable(bundle)
      ? `\nКомбинация: столы ${bundle.tables.join(', ')}${bundle.total_capacity ? ` (до ${bundle.total_capacity} чел.)` : ''}`
      : '';

    return (
      <div
        key={table.tableId}
        className={`${baseStyles} ${statusStyles[status]} ${isClickable ? '' : 'cursor-default'}`}
        style={{
          left: `${table.x}%`,
          top: `${table.y}%`,
          ...shapeStyles,
        }}
        onClick={() => {
          if (bundle && onBundleSelect && isBundleAvailable(bundle)) {
            handleBundleClick(bundle);
          } else if (isClickable) {
            handleTableClick(table.tableId);
          }
        }}
        title={`Стол ${table.tableNumber}${table.capacity ? ` (до ${table.capacity} чел.)` : ''}${bundleInfo}`}
      >
        <span>{table.tableNumber}</span>
        {bundle && isBundleAvailable(bundle) && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Переключатель залов */}
      {hallSchemes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {hallSchemes.map((hall) => (
            <button
              key={hall.roomId}
              onClick={() => setSelectedHall(hall)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedHall?.roomId === hall.roomId
                  ? 'bg-primary text-text-secondary shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {hall.roomName}
            </button>
          ))}
        </div>
      )}

      {/* Схема зала */}
      {selectedHall && (
        <div className="relative bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200">
          {/* Фоновое изображение зала (если есть) */}
          {selectedHall.imageUrl ? (
            <div className="relative" style={{ width: '100%', paddingBottom: selectedHall.height && selectedHall.width ? `${(selectedHall.height / selectedHall.width) * 100}%` : '75%' }}>
              <img
                src={selectedHall.imageUrl}
                alt={`Схема зала ${selectedHall.roomName}`}
                className="absolute inset-0 w-full h-full object-contain"
              />
              {/* Столы поверх изображения */}
              <div className="absolute inset-0">
                {selectedHall.tables.map(renderTable)}
              </div>
            </div>
          ) : (
            /* Схема без изображения - только столы */
            <div className="relative" style={{ minHeight: '400px', padding: '20px' }}>
              {selectedHall.tables.map(renderTable)}
            </div>
          )}

          {/* Легенда */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded-full"></div>
                <span>Доступен</span>
              </div>
              {normalizedBundles.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded-full relative">
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  </div>
                  <span>В комбинации</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary border-2 border-primary-dark rounded-full"></div>
                <span>Выбран</span>
              </div>
              {availableTableIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded-full opacity-50"></div>
                  <span>Недоступен</span>
                </div>
              )}
            </div>
            {/* Отображение доступных комбинаций */}
            {normalizedBundles.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Доступные комбинации столов:</div>
                <div className="flex flex-wrap gap-2">
                  {normalizedBundles.map((bundle, index) => {
                    const isAvailable = isBundleAvailable(bundle);
                    const isSelected = isBundleFullySelected(bundle);
                    return (
                      <button
                        key={index}
                        onClick={() => isAvailable && handleBundleClick(bundle)}
                        disabled={!isAvailable}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          isSelected
                            ? 'bg-primary text-text-secondary'
                            : isAvailable
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={`Столы: ${bundle.tables.join(', ')}${bundle.total_capacity ? ` (до ${bundle.total_capacity} чел.)` : ''}`}
                      >
                        Столы {bundle.tables.join(', ')}
                        {bundle.total_capacity && ` (${bundle.total_capacity} чел.)`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
