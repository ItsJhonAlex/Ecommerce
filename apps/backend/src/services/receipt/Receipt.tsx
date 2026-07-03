import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

/** Una línea del pedido en el recibo. */
export type ReceiptItem = {
  productName: string;
  quantity: number;
  unitAmountMinor: number;
  lineTotalMinor: number;
};

/** Un pago asociado al pedido (se muestra el primero). */
export type ReceiptPayment = {
  method: string;
  status: string;
};

/** Forma mínima del pedido que el recibo necesita. */
export type ReceiptOrder = {
  orderNumber: string;
  createdAt: Date | string;
  currency: string;
  fulfillment: "pickup" | "delivery";

  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;

  shipRecipient: string;
  shipPhone: string;
  shipProvince: string | null;
  shipMunicipality: string | null;
  shipAddressLine: string | null;
  shipReference: string | null;

  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  totalMinor: number;

  items: ReceiptItem[];
  payments: ReceiptPayment[];
};

/** Datos del negocio configurables desde el admin. */
export type ReceiptSettings = {
  businessName: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  receiptNote: string | null;
};

/** 1999 → "19.99 USD". Los montos son enteros en centavos. */
function formatMoney(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

/** Fecha legible: dd/mm/yyyy hh:mm. */
function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// Fuentes por defecto (Helvetica), sin registrar assets externos.
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  wordmark: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
  },
  businessLine: {
    fontSize: 9,
    color: "#555555",
    marginTop: 2,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: "#555555",
  },
  meta: {
    marginTop: 2,
  },
  // Tabla de ítems.
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
  },
  colName: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 2, textAlign: "right" },
  colSubtotal: { flex: 2, textAlign: "right" },
  // Totales.
  totalsBox: {
    marginTop: 12,
    marginLeft: "auto",
    width: "50%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalStrong: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    paddingTop: 4,
    marginTop: 2,
  },
  footer: {
    marginTop: 28,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#dddddd",
    fontSize: 9,
    color: "#555555",
  },
});

/** Recibo del pedido como documento PDF. */
export function Receipt({
  order,
  settings,
}: {
  order: ReceiptOrder;
  settings: ReceiptSettings;
}) {
  const isDelivery = order.fulfillment === "delivery";
  const firstPayment = order.payments[0];

  return (
    <Document title={`Recibo ${order.orderNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Encabezado: nombre del negocio + contacto */}
        <View>
          <Text style={styles.wordmark}>{settings.businessName}</Text>
          {settings.phone ? (
            <Text style={styles.businessLine}>Tel: {settings.phone}</Text>
          ) : null}
          {settings.address ? (
            <Text style={styles.businessLine}>{settings.address}</Text>
          ) : null}
          {settings.email ? (
            <Text style={styles.businessLine}>{settings.email}</Text>
          ) : null}
        </View>

        {/* Título + datos del pedido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recibo</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Pedido</Text>
            <Text>{order.orderNumber}</Text>
          </View>
          <View style={[styles.row, styles.meta]}>
            <Text style={styles.label}>Fecha</Text>
            <Text>{formatDate(order.createdAt)}</Text>
          </View>
        </View>

        {/* Comprador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comprador</Text>
          <Text>{order.buyerName}</Text>
          <Text style={styles.meta}>{order.buyerEmail}</Text>
          <Text style={styles.meta}>{order.buyerPhone}</Text>
        </View>

        {/* Método de entrega */}
        <View style={styles.section}>
          {isDelivery ? (
            <>
              <Text style={styles.sectionTitle}>Envío a domicilio</Text>
              <Text>{order.shipRecipient}</Text>
              <Text style={styles.meta}>{order.shipPhone}</Text>
              {order.shipAddressLine ? (
                <Text style={styles.meta}>{order.shipAddressLine}</Text>
              ) : null}
              <Text style={styles.meta}>
                {[order.shipMunicipality, order.shipProvince]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              {order.shipReference ? (
                <Text style={styles.meta}>Referencia: {order.shipReference}</Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Retiro</Text>
              <Text>{order.shipRecipient}</Text>
              <Text style={styles.meta}>{order.shipPhone}</Text>
              {settings.address ? (
                <Text style={styles.meta}>Retirar en: {settings.address}</Text>
              ) : null}
            </>
          )}
        </View>

        {/* Ítems */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ítems</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colName}>Producto</Text>
            <Text style={styles.colQty}>Cant.</Text>
            <Text style={styles.colUnit}>Unit.</Text>
            <Text style={styles.colSubtotal}>Subtotal</Text>
          </View>
          {order.items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colName}>{item.productName}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>
                {formatMoney(item.unitAmountMinor, order.currency)}
              </Text>
              <Text style={styles.colSubtotal}>
                {formatMoney(item.lineTotalMinor, order.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text>{formatMoney(order.subtotalMinor, order.currency)}</Text>
          </View>
          {isDelivery ? (
            <View style={styles.totalsRow}>
              <Text style={styles.label}>Envío</Text>
              <Text>{formatMoney(order.shippingMinor, order.currency)}</Text>
            </View>
          ) : null}
          {order.discountMinor > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.label}>Descuento</Text>
              <Text>-{formatMoney(order.discountMinor, order.currency)}</Text>
            </View>
          ) : null}
          <View style={[styles.totalsRow, styles.totalStrong]}>
            <Text>Total</Text>
            <Text>{formatMoney(order.totalMinor, order.currency)}</Text>
          </View>
        </View>

        {/* Pago */}
        {firstPayment ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pago</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Método</Text>
              <Text>{firstPayment.method}</Text>
            </View>
            <View style={[styles.row, styles.meta]}>
              <Text style={styles.label}>Estado</Text>
              <Text>{firstPayment.status}</Text>
            </View>
          </View>
        ) : null}

        {/* Pie: nota del recibo */}
        {settings.receiptNote ? (
          <Text style={styles.footer}>{settings.receiptNote}</Text>
        ) : null}
      </Page>
    </Document>
  );
}
