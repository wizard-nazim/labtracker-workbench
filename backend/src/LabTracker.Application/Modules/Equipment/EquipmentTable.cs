using System.Text;
using ClosedXML.Excel;

namespace LabTracker.Application.Modules.Equipment;

public enum TableFormat
{
    Csv,
    Xlsx,
}

// A header row plus data rows, read from or written to CSV (RFC 4180) or
// Excel. Only the first worksheet of a workbook is read.
public static class EquipmentTable
{
    public static string ContentType(TableFormat format) => format == TableFormat.Csv
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public static string Extension(TableFormat format) => format == TableFormat.Csv ? "csv" : "xlsx";

    public static byte[] Write(TableFormat format, IReadOnlyList<string> headers, IEnumerable<IReadOnlyList<string>> rows)
        => format == TableFormat.Csv ? WriteCsv(headers, rows) : WriteXlsx(headers, rows);

    // Throws FormatException for a file that isn't readable as the format.
    public static List<string[]> Read(TableFormat format, Stream stream)
        => format == TableFormat.Csv ? ReadCsv(stream) : ReadXlsx(stream);

    private static byte[] WriteCsv(IReadOnlyList<string> headers, IEnumerable<IReadOnlyList<string>> rows)
    {
        var sb = new StringBuilder();
        AppendCsvLine(sb, headers);
        foreach (var row in rows) AppendCsvLine(sb, row);
        // With a BOM so Excel opens accented names correctly.
        return [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(sb.ToString())];
    }

    private static void AppendCsvLine(StringBuilder sb, IReadOnlyList<string> fields)
    {
        for (var i = 0; i < fields.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append(EscapeCsv(fields[i]));
        }
        sb.Append("\r\n");
    }

    private static string EscapeCsv(string value)
    {
        // A leading = + - @ would run as a formula when the file is opened in
        // a spreadsheet (CSV injection), so it's neutralised with a quote mark.
        if (value.Length > 0 && "=+-@\t\r".Contains(value[0])) value = "'" + value;
        return value.IndexOfAny([',', '"', '\r', '\n']) >= 0
            ? "\"" + value.Replace("\"", "\"\"") + "\""
            : value;
    }

    private static List<string[]> ReadCsv(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var text = reader.ReadToEnd();

        var rows = new List<string[]>();
        var row = new List<string>();
        var field = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (inQuotes)
            {
                if (c == '"' && i + 1 < text.Length && text[i + 1] == '"')
                {
                    field.Append('"');
                    i++;
                }
                else if (c == '"') inQuotes = false;
                else field.Append(c);
            }
            else if (c == '"' && field.Length == 0) inQuotes = true;
            else if (c == ',')
            {
                row.Add(field.ToString());
                field.Clear();
            }
            else if (c == '\r' || c == '\n')
            {
                if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++;
                row.Add(field.ToString());
                field.Clear();
                rows.Add([.. row]);
                row.Clear();
            }
            else field.Append(c);
        }

        if (inQuotes) throw new FormatException("The file has a quoted value that never ends.");
        if (field.Length > 0 || row.Count > 0)
        {
            row.Add(field.ToString());
            rows.Add([.. row]);
        }
        return rows;
    }

    private static byte[] WriteXlsx(IReadOnlyList<string> headers, IEnumerable<IReadOnlyList<string>> rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Equipment");

        for (var c = 0; c < headers.Count; c++) sheet.Cell(1, c + 1).Value = headers[c];
        sheet.Row(1).Style.Font.Bold = true;

        var r = 2;
        foreach (var row in rows)
        {
            // Always text, so serial numbers like 00123 keep their zeros and
            // nothing is treated as a formula.
            for (var c = 0; c < row.Count; c++) sheet.Cell(r, c + 1).SetValue(row[c]);
            r++;
        }

        sheet.SheetView.FreezeRows(1);
        sheet.Columns(1, headers.Count).AdjustToContents(1, Math.Min(r, 200));

        using var output = new MemoryStream();
        workbook.SaveAs(output);
        return output.ToArray();
    }

    private static List<string[]> ReadXlsx(Stream stream)
    {
        XLWorkbook workbook;
        try
        {
            workbook = new XLWorkbook(stream);
        }
        catch (Exception ex) when (ex is not OutOfMemoryException)
        {
            throw new FormatException("The file isn't a readable Excel workbook (.xlsx).", ex);
        }

        using (workbook)
        {
            var sheet = workbook.Worksheets.First();
            var used = sheet.RangeUsed();
            if (used is null) return [];

            var lastColumn = used.LastColumn().ColumnNumber();
            var rows = new List<string[]>();
            foreach (var row in sheet.Rows(1, used.LastRow().RowNumber()))
            {
                var values = new string[lastColumn];
                for (var c = 1; c <= lastColumn; c++) values[c - 1] = row.Cell(c).GetFormattedString();
                rows.Add(values);
            }
            return rows;
        }
    }
}
