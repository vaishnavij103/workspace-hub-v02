import pdfplumber
import re , io
from datetime import datetime

def clean_text(value):
    if value is None:
        return None
    return re.sub(r"\s+", " ", str(value)).strip()

def safe_float(value, default=0.0):
    if value is None or value == '':
        return default

    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def clean_amount(value):
    if value is None:
        return None

    value = clean_text(value)

    # Remove currency symbols
    value = re.sub(r"[$€£₹¥]", "", value)
    value = value.replace(",", "").strip()

    try:
        return float(value)
    except ValueError:
        return None


def extract_invoice_fields(file_bytes):

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        full_text = "\n".join(
            page.extract_text() or ""
            for page in pdf.pages
        )

    lines = [
        clean_text(line)
        for line in full_text.splitlines()
        if clean_text(line)
    ]

    # ---------------------------------------------------------
    # Document type
    # ---------------------------------------------------------

    document_type = "invoice"

    # ---------------------------------------------------------
    # Vendor
    # ---------------------------------------------------------

    vendor_name = None

    if lines:
        # Example:
        # SuperStore INVOICE
        match = re.match(
            r"^(.+?)\s+INVOICE$",
            lines[0],
            re.IGNORECASE
        )

        if match:
            vendor_name = clean_text(match.group(1))

    # ---------------------------------------------------------
    # Vendor address
    # ---------------------------------------------------------

    # No vendor address exists in this invoice.
    vendor_address = None

    # ---------------------------------------------------------
    # Invoice number
    # ---------------------------------------------------------

    invoice_number = None

    match = re.search(
        r"^\s*#\s*([A-Za-z0-9\-_]+)",
        full_text,
        re.MULTILINE
    )

    if match:
        invoice_number = match.group(1)

    # ---------------------------------------------------------
    # Invoice date
    # ---------------------------------------------------------

    invoice_date = None

    match = re.search(
        r"\bDate:\s*([A-Za-z]{3}\s+\d{1,2}\s+\d{4})",
        full_text,
        re.IGNORECASE
    )

    if match:
        invoice_date = match.group(1)

    # ---------------------------------------------------------
    # Currency
    # ---------------------------------------------------------

    currency = "USD" if "$" in full_text else None

    # ---------------------------------------------------------
    # Items
    # ---------------------------------------------------------

    items = []

    # Find the Item table header
    try:
        item_header_index = next(
            i for i, line in enumerate(lines)
            if re.match(
                r"^Item\s+Quantity\s+Rate\s+Amount$",
                line,
                re.IGNORECASE
            )
        )
    except StopIteration:
        item_header_index = None

    if item_header_index is not None:

        # Process lines after the header
        for line in lines[item_header_index + 1:]:

            # Stop once we reach the invoice summary
            if re.match(
                r"^(Subtotal|Discount|Shipping|Total|Notes|Terms)\b",
                line,
                re.IGNORECASE
            ):
                break

            # Expected format:
            #
            # Global Push Button Manager's Chair, Indigo 1 $48.71 $48.71
            #
            # The description itself may contain spaces and punctuation.

            match = re.match(
                r"^(.*?)\s+"
                r"(\d+(?:\.\d+)?)\s+"
                r"\$?([\d,.]+)\s+"
                r"\$?([\d,.]+)$",
                line
            )

            if match:

                description = clean_text(match.group(1))
                quantity = float(match.group(2))
                unit_price = clean_amount(match.group(3))
                amount = clean_amount(match.group(4))

                items.append({
                    "description": description,
                    "type_of_service": None,
                    "start_date": None,
                    "end_date": None,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "amount": amount
                })

    # ---------------------------------------------------------
    # Subtotal
    # ---------------------------------------------------------

    subtotal = None

    match = re.search(
        r"\bSubtotal:\s*\$?([\d,.]+)",
        full_text,
        re.IGNORECASE
    )

    if match:
        subtotal = clean_amount(match.group(1))

    # ---------------------------------------------------------
    # Tax
    # ---------------------------------------------------------

    tax = None

    # This invoice has no tax field.
    # Discount and shipping are separate charges.
    match = re.search(
        r"\b(?:Tax|VAT|GST):\s*\$?([\d,.]+)",
        full_text,
        re.IGNORECASE
    )

    if match:
        tax = clean_amount(match.group(1))

    # ---------------------------------------------------------
    # Total
    # ---------------------------------------------------------

    total_amount = None

    # IMPORTANT:
    # Use ^Total rather than just "Total"
    # so that "Subtotal" is not accidentally matched.

    match = re.search(
        r"^\s*Total:\s*\$?([\d,.]+)",
        full_text,
        re.MULTILINE | re.IGNORECASE
    )

    if match:
        total_amount = clean_amount(match.group(1))

    # ---------------------------------------------------------
    # Return result
    # ---------------------------------------------------------

    return {
        "document_type": document_type,
        "vendor_name": vendor_name,
        "vendor_address": vendor_address,
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "items": items,
        "subtotal": subtotal,
        "tax": tax,
        "total_amount": total_amount,
        "currency": currency
    }