import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';

/**
 * Export data to Excel file
 */
export const exportToExcel = async (data, filename = 'export') => {
    try {
        // Create workbook
        const wb = XLSX.utils.book_new();

        // Convert data to worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Data');

        // Generate binary string
        const wbout = XLSX.write(wb, {
            type: 'base64',
            bookType: 'xlsx'
        });

        // Save to file
        const uri = FileSystem.documentDirectory + `${filename}_${Date.now()}.xlsx`;
        await FileSystem.writeAsStringAsync(uri, wbout, {
            encoding: FileSystem.EncodingType.Base64
        });

        // Share file
        await Sharing.shareAsync(uri);

        console.log('✅ Excel exported successfully');
        return { success: true, uri };
    } catch (error) {
        console.error('❌ Excel export failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export data to CSV file
 */
export const exportToCSV = async (data, filename = 'export') => {
    try {
        // Convert to CSV
        const csv = convertToCSV(data);

        // Save to file
        const uri = FileSystem.documentDirectory + `${filename}_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(uri, csv);

        // Share file
        await Sharing.shareAsync(uri);

        console.log('✅ CSV exported successfully');
        return { success: true, uri };
    } catch (error) {
        console.error('❌ CSV export failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Convert JSON to CSV
 */
const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};
