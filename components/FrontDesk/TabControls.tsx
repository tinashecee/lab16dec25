import { useState } from 'react';
import { DatePicker } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

interface TabControlsProps {
  onSearch: (value: string) => void;
  onDateRangeChange: (dates: [Date, Date] | null) => void;
  onExport: (format: 'pdf' | 'excel') => void;
}

export const TabControls: React.FC<TabControlsProps> = ({
  onSearch,
  onDateRangeChange,
  onExport,
}) => {
  const [exportModalVisible, setExportModalVisible] = useState(false);
  
  return (
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      <input
        type="search"
        placeholder="Search..."
        className="px-4 py-2 border rounded-lg"
        onChange={(e) => onSearch(e.target.value)}
      />
      
      <RangePicker
        onChange={(_, dateStrings) => {
          const [start, end] = dateStrings;
          if (start && end) {
            onDateRangeChange([new Date(start), new Date(end)]);
          } else {
            onDateRangeChange(null);
          }
        }}
      />
      
      <Dropdown
        overlay={
          <Menu>
            <Menu.Item 
              icon={<FilePdfOutlined />}
              onClick={() => onExport('pdf')}
            >
              Export as PDF
            </Menu.Item>
            <Menu.Item 
              icon={<FileExcelOutlined />}
              onClick={() => onExport('excel')}
            >
              Export as Excel
            </Menu.Item>
          </Menu>
        }
      >
        <Button icon={<DownloadOutlined />}>Export</Button>
      </Dropdown>
    </div>
  );
}; 