import React from 'react';
import { Button, Card, CardBody, Input, Tabs, Tab, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useData } from '../../contexts/data-context';
import { Room, Employee, AccessRight } from '../../types';

export const ImportExport: React.FC = () => {
  const { bulkImportRooms, bulkImportEmployees, bulkImportAccessRights, getRooms, getEmployees } = useData();
  const [activeTab, setActiveTab] = React.useState<string>('rooms');
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importPreview, setImportPreview] = React.useState<any[]>([]);
  const [importError, setImportError] = React.useState<string>('');
  const [isImporting, setIsImporting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    setImportError('');
    
    // Preview file (in a real app, this would parse CSV/Excel)
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        // This is a simplified example - in a real app you'd use a proper CSV/Excel parser
        const content = event.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const previewData = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        
        setImportPreview(previewData);
      } catch (err) {
        setImportError('Ошибка при чтении файла. Убедитесь, что файл имеет правильный формат.');
        setImportPreview([]);
      }
    };
    reader.onerror = () => {
      setImportError('Ошибка при чтении файла.');
      setImportPreview([]);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile || importPreview.length === 0) return;
    
    setIsImporting(true);
    
    try {
      if (activeTab === 'rooms') {
        // Parse rooms from CSV
        const rooms: Omit<Room, 'id'>[] = importPreview.map(row => ({
          number: row.number,
          building: parseInt(row.building),
          floor: parseInt(row.floor)
        }));
        
        await bulkImportRooms(rooms);
      } else {
        // Parse employees from CSV
        const employees: Omit<Employee, 'id'>[] = importPreview.map(row => ({
          lastName: row.lastName,
          firstName: row.firstName,
          middleName: row.middleName,
          employeeId: row.employeeId,
          accessRooms: row.accessRooms ? row.accessRooms.split(';').map(Number) : []
        }));
        
        await bulkImportEmployees(employees);
      }
      
      // Reset import state
      setImportFile(null);
      setImportPreview([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      alert(`Импорт файла ${importFile.name} успешно выполнен!`);
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Ошибка при импорте данных.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let data: any[] = [];
      let fileName = '';
      
      if (activeTab === 'rooms') {
        // Export rooms
        const rooms = await getRooms();
        data = rooms.map(room => ({
          id: room.id,
          number: room.number,
          building: room.building,
          floor: room.floor
        }));
        fileName = 'rooms_export.csv';
      } else {
        // Export employees
        const employees = await getEmployees();
        data = employees.map(employee => ({
          id: employee.id,
          lastName: employee.lastName,
          firstName: employee.firstName,
          middleName: employee.middleName,
          employeeId: employee.employeeId,
          accessRooms: employee.accessRooms.join(';')
        }));
        fileName = 'employees_export.csv';
      }
      
      // Convert to CSV
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(item => Object.values(item).join(','));
      const csv = [headers, ...rows].join('\n');
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`Экспорт ${activeTab === 'rooms' ? 'помещений' : 'сотрудников'} успешно выполнен!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте данных.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClickFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Generate sample data for download
  const generateSampleData = (type: 'rooms' | 'employees') => {
    const headers = type === 'rooms' 
      ? 'number,building,floor'
      : 'lastName,firstName,middleName,employeeId,accessRooms';
    
    let content = headers + '\n';
    
    if (type === 'rooms') {
      content += '101,1,1\n';
      content += '102,1,1\n';
      content += '103,1,1\n';
      content += '201,1,2\n';
      content += '202,1,2\n';
    } else {
      content += 'Иванов,Иван,Иванович,EMP001,1;2;3\n';
      content += 'Петров,Петр,Петрович,EMP002,2;3;4\n';
      content += 'Сидорова,Мария,Александровна,EMP003,1;3;5\n';
    }
    
    return content;
  };

  const downloadSampleFile = (type: 'rooms' | 'employees') => {
    const content = generateSampleData(type);
    const fileName = type === 'rooms' ? 'rooms_template.csv' : 'employees_template.csv';
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <Tabs 
        aria-label="Import/Export Options" 
        selectedKey={activeTab} 
        onSelectionChange={(key) => setActiveTab(key as string)}
        className="mb-6"
      >
        <Tab key="rooms" title={
          <div className="flex items-center gap-2">
            <Icon icon="lucide:door-open" />
            <span>Помещения</span>
          </div>
        }/>
        <Tab key="employees" title={
          <div className="flex items-center gap-2">
            <Icon icon="lucide:users" />
            <span>Сотрудники</span>
          </div>
        }/>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold mb-4">Импорт данных</h2>
            <p className="text-default-500 mb-4">
              {activeTab === 'rooms' 
                ? 'Загрузите CSV файл со списком помещений для массового импорта.' 
                : 'Загрузите CSV файл со списком сотрудников для массового импорта.'}
            </p>
            
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls" 
              onChange={handleFileChange} 
              className="hidden"
              ref={fileInputRef}
            />
            
            <div className="flex flex-col gap-4">
              <Button 
                color="primary" 
                variant="bordered" 
                startContent={<Icon icon="lucide:upload" />}
                onPress={handleClickFileInput}
                className="w-full"
                isDisabled={isImporting}
              >
                Выбрать файл
              </Button>
              
              {importFile && (
                <div className="p-2 bg-content2 rounded-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:file-text" className="text-primary" />
                    <span>{importFile.name}</span>
                  </div>
                  <Button 
                    isIconOnly 
                    size="sm" 
                    variant="light" 
                    onPress={() => {
                      setImportFile(null);
                      setImportPreview([]);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    isDisabled={isImporting}
                  >
                    <Icon icon="lucide:x" />
                  </Button>
                </div>
              )}
              
              {importError && (
                <div className="text-danger text-small">{importError}</div>
              )}
              
              {importPreview.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-medium font-semibold mb-2">Предпросмотр данных</h3>
                  <div className="max-h-64 overflow-y-auto border border-default-200 rounded-medium">
                    <Table removeWrapper aria-label="Import preview">
                      <TableHeader>
                        {Object.keys(importPreview[0]).map((header, index) => (
                          <TableColumn key={index}>{header}</TableColumn>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {Object.values(row).map((cell, cellIndex) => (
                              <TableCell key={cellIndex}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 text-small text-default-500">
                    Показаны первые 5 строк из файла. Всего строк: {importFile?.size ? Math.floor(importFile.size / 100) : 0}
                  </div>
                  <Button 
                    color="primary" 
                    className="mt-4 w-full"
                    onPress={handleImport}
                    isLoading={isImporting}
                    isDisabled={isImporting}
                  >
                    Импортировать данные
                  </Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold mb-4">Экспорт данных</h2>
            <p className="text-default-500 mb-4">
              {activeTab === 'rooms' 
                ? 'Выгрузите список всех помещений в CSV файл.' 
                : 'Выгрузите список всех сотрудников с их доступами в CSV файл.'}
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-content2 rounded-medium">
                <h3 className="text-medium font-semibold mb-2">Формат экспорта</h3>
                {activeTab === 'rooms' ? (
                  <ul className="list-disc list-inside space-y-1 text-default-500">
                    <li>ID помещения</li>
                    <li>Номер помещения</li>
                    <li>Корпус</li>
                    <li>Этаж</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-default-500">
                    <li>ID сотрудника</li>
                    <li>Фамилия</li>
                    <li>Имя</li>
                    <li>Отчество</li>
                    <li>Табельный номер</li>
                    <li>Список ID помещений с доступом</li>
                  </ul>
                )}
              </div>
              
              <Button 
                color="primary" 
                startContent={<Icon icon="lucide:download" />}
                onPress={handleExport}
                className="w-full"
                isLoading={isExporting}
                isDisabled={isExporting}
              >
                Экспортировать {activeTab === 'rooms' ? 'помещения' : 'сотрудников'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardBody>
          <h2 className="text-lg font-semibold mb-4">Шаблоны для импорта</h2>
          <p className="text-default-500 mb-4">
            Скачайте шаблоны файлов для корректного импорта данных.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4">
            <Button 
              variant="bordered" 
              startContent={<Icon icon="lucide:file-text" />}
              className="flex-1"
              onPress={() => downloadSampleFile('rooms')}
            >
              Шаблон для импорта помещений
            </Button>
            <Button 
              variant="bordered" 
              startContent={<Icon icon="lucide:file-text" />}
              className="flex-1"
              onPress={() => downloadSampleFile('employees')}
            >
              Шаблон для импорта сотрудников
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
