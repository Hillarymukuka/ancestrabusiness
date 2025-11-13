# CSV Stock Update Guide

## Overview
The Smart Business SME application now supports uploading CSV files to bulk update product stock quantities. This feature is available to users with **Owner** or **Manager** roles.

## How to Use

### 1. Access the Feature
- Navigate to the **Inventory** page
- Click the **"Import CSV"** button in the top right corner
- Select your CSV file from your computer

### 2. CSV File Format

Your CSV file must include a header row and can use one of two formats:

#### Option 1: Update by Product ID
```csv
id,quantity
1,50
2,100
3,75
```

#### Option 2: Update by Product Name
```csv
name,quantity
Maize Flour 25kg,75
Cooking Oil 5L,120
Dish Soap,80
```

### Supported Column Names
- **Product Identification**: `id`, `product_id`, `name`, or `product_name`
- **Stock Quantity**: `quantity` (required)

## CSV Template

You can download a template CSV file by clicking the **"CSV Template"** button on the Inventory page.

## Example CSV Files

### Example 1: Simple Stock Update
```csv
id,quantity
1,150
2,200
3,75
```

### Example 2: Using Product Names
```csv
name,quantity
Maize Flour 25kg,100
Cooking Oil 5L,150
Dish Soap,200
Rice 10kg,80
```

### Example 3: Mixed Format (Use Either ID or Name)
```csv
product_id,quantity
1,125
5,90
```

## Important Notes

### âœ… Requirements
- File must be in CSV format (`.csv` extension)
- Must include a header row
- Quantity values must be non-negative integers
- Product must exist in the database (either by ID or exact name match)

### âš ï¸ Validation Rules
- **Negative quantities are rejected** - Stock cannot be negative
- **Invalid product IDs/names are skipped** - Products not found will be listed in the results
- **Invalid quantity values are reported** - Non-numeric values will show errors
- **Missing required columns** - Each row must have a quantity value

### ðŸ“Š Upload Results

After uploading, you'll see a detailed report showing:
- **Total products updated successfully**
- **Products not found** (invalid IDs or names)
- **Errors encountered** (invalid data, missing columns, etc.)

#### Example Success Message:
```
âœ“ Successfully updated stock for 5 product(s)
```

#### Example with Warnings:
```
âœ“ Successfully updated stock for 3 product(s)

Products not found:
- Row 4: Product 'Unknown Item' not found
- Row 7: Product '999' not found

Errors:
- Row 5: Invalid quantity value 'abc'
- Row 8: Quantity cannot be negative
```

## Best Practices

1. **Export First**: Use the "Export CSV" button to get the current inventory list with correct product IDs and names
2. **Test with Small Files**: Start with a small CSV to verify the format works correctly
3. **Backup Your Data**: Before large updates, export your current inventory as a backup
4. **Use Exact Names**: When using product names, ensure they match exactly (case-sensitive)
5. **Check Results**: Always review the upload results to ensure all products were updated

## Troubleshooting

### Problem: "Product not found" errors
**Solution**: 
- Verify product IDs exist in your database (use Export to see valid IDs)
- Check product names are spelled exactly as they appear in the inventory
- Product names are case-sensitive

### Problem: "Invalid quantity value" errors
**Solution**:
- Ensure quantity column contains only numeric values
- Remove any currency symbols, commas, or text from quantity values
- Check for empty cells in the quantity column

### Problem: "Missing 'quantity' column" error
**Solution**:
- Ensure your CSV has a header row
- The header must include a column named `quantity`
- Check for typos in column names

### Problem: CSV file not uploading
**Solution**:
- Verify file has `.csv` extension
- Check file is not corrupted or in use by another program
- Ensure file size is reasonable (large files may take longer)
- Try saving the CSV file again from your spreadsheet program

## Creating CSV Files

### Using Microsoft Excel:
1. Create your data in Excel
2. Go to **File > Save As**
3. Choose **CSV (Comma delimited) (*.csv)** as the file type
4. Save the file

### Using Google Sheets:
1. Create your data in Google Sheets
2. Go to **File > Download**
3. Select **Comma Separated Values (.csv)**
4. Save the file

### Using a Text Editor:
1. Create a new text file
2. Type your data with commas separating columns
3. Save with `.csv` extension

## API Endpoint (For Developers)

### Endpoint
```
POST /api/products/import
```

### Headers
```
Content-Type: multipart/form-data
Authorization: Bearer <your_jwt_token>
```

### Request Body
- Form data with file field named `file`

### Response Format
```json
{
  "success": true,
  "updated_count": 5,
  "not_found": [
    "Row 6: Product 'Invalid Product' not found"
  ],
  "errors": [
    "Row 8: Quantity cannot be negative"
  ],
  "message": "Successfully updated stock for 5 product(s)"
}
```

### HTTP Status Codes
- `200 OK` - Upload processed (check response for individual item results)
- `400 Bad Request` - Invalid file format or not a CSV file
- `403 Forbidden` - User doesn't have permission (requires Owner/Manager role)
- `500 Internal Server Error` - Server error during processing

## Security & Permissions

- Only users with **Owner** or **Manager** roles can upload CSV files
- All uploads are logged and can be traced back to the user
- Uploads are processed in a transaction - if any critical error occurs, no changes are made

## Support

For issues or questions about CSV stock updates, please contact your system administrator.
