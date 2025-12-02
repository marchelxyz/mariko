import { useState, useEffect } from 'react';
import { HallScheme, TablePosition } from '@/types/booking';

interface HallSchemeViewerProps {
  hallSchemes: HallScheme[];
  selectedTableIds?: number[];
  availableTableIds?: number[];
  onTableSelect?: (tableId: number) => void;
  className?: string;
}

export default function HallSchemeViewer({
  hallSchemes,
  selectedTableIds = [],
  availableTableIds = [],
  onTableSelect,
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

  const getTableStatus = (tableId: number): 'available' | 'selected' | 'unavailable' => {
    if (selectedTableIds.includes(tableId)) {
      return 'selected';
    }
    if (availableTableIds.length > 0 && !availableTableIds.includes(tableId)) {
      return 'unavailable';
    }
    return 'available';
  };

  const renderTable = (table: TablePosition) => {
    const status = getTableStatus(table.tableId);
    const isClickable = onTableSelect && (status === 'available' || status === 'selected');

    const baseStyles = 'absolute flex items-center justify-center text-xs font-medium transition-all cursor-pointer';
    const statusStyles = {
      available: 'bg-green-100 border-2 border-green-400 text-green-800 hover:bg-green-200 hover:border-green-500',
      selected: 'bg-primary border-2 border-primary-dark text-text-secondary shadow-lg scale-110',
      unavailable: 'bg-gray-100 border-2 border-gray-300 text-gray-400 cursor-not-allowed opacity-50',
    };

    const shapeStyles = table.shape === 'rectangle' && table.width && table.height
      ? { width: `${table.width}px`, height: `${table.height}px` }
      : table.shape === 'circle' && table.width
      ? { width: `${table.width}px`, height: `${table.width}px`, borderRadius: '50%' }
      : { width: '40px', height: '40px', borderRadius: '50%' };

    return (
      <div
        key={table.tableId}
        className={`${baseStyles} ${statusStyles[status]} ${isClickable ? '' : 'cursor-default'}`}
        style={{
          left: `${table.x}%`,
          top: `${table.y}%`,
          ...shapeStyles,
        }}
        onClick={() => isClickable && handleTableClick(table.tableId)}
        title={`Стол ${table.tableNumber}${table.capacity ? ` (до ${table.capacity} чел.)` : ''}`}
      >
        <span>{table.tableNumber}</span>
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
          </div>
        </div>
      )}
    </div>
  );
}
