const DEFAULT_CSV_CONTENT = "Destination URL\nhttps://example.com";

interface CsvFileOptions {
    name?: string;
    type?: string;
    content?: string;
}

export function createCsvFile({name = "links.csv", type = "text/csv", content = DEFAULT_CSV_CONTENT}: CsvFileOptions = {}): File {
    return new File([content], name, {type});
}
