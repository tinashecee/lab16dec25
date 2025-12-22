import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Requisition } from '../../lib/firestore/inventory';
import QRCode from 'qrcode';
import { auth } from '../../config/firebase';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  headerLeft: {
    width: 120,
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  headerRight: {
    width: 100,
    alignItems: 'center',
  },
  qrCode: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dispatchNumber: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'center',
  },
  label: {
    width: 100,
    fontSize: 10,
    color: '#666',
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
    fontSize: 10,
    minHeight: 30,
    alignItems: 'center',
  },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  status: {
    padding: 4,
    borderRadius: 4,
    fontSize: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  approvalSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
  },
  signatureSection: {
    marginTop: 'auto',
    paddingTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '30%',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginTop: 40,
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  signatureDate: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
  },
  notes: {
    fontSize: 9,
    color: '#666',
    marginTop: 3,
    fontStyle: 'italic',
  },
  logo: {
    width: 100,
    height: 'auto',
    maxHeight: 80,
  },
  companyInfo: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
});

interface RequisitionPDFProps {
  requisition: Requisition;
}

export const RequisitionPDF = ({ requisition }: RequisitionPDFProps) => {
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');

  const generateQRCode = async () => {
    // Generate a URL that includes an auth redirect
    const baseUrl = window.location.origin;
    const requisitionPath = `/auth-redirect?destination=/inventory/requisition/${requisition.id}`;
    const qrUrl = `${baseUrl}${requisitionPath}`;
    
    try {
      const qrDataUrl = await QRCode.toDataURL(qrUrl);
      return qrDataUrl;
    } catch (err) {
      console.error('QR Code generation failed:', err);
      return '';
    }
  };

  React.useEffect(() => {
    const generateQR = async () => {
      try {
        const url = `${window.location.origin}/issue-requisition/${requisition.id}`;
        const qrCode = await QRCode.toDataURL(url);
        setQrCodeUrl(qrCode);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };
    generateQR();
  }, [requisition.id]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Updated Header with Logo */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Image
              style={styles.logo}
              src="/images/logo.png"
            />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>LABORATORY SERVICES</Text>
            <Text style={styles.companyInfo}>
              19 Nigel Phillips Ave ue, Belgravia, Harare{'\n'}
              Tel: +1234567890{'\n'}
              Email: info@laboratory.com
            </Text>
            <Text style={[styles.title, { fontSize: 14, marginTop: 10 }]}>
              Material Requisition Form
            </Text>
          </View>
          <View style={styles.headerRight}>
            {qrCodeUrl && <Image style={styles.qrCode} src={qrCodeUrl} />}
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Department:</Text>
            <Text style={styles.value}>{requisition.department}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Requested By:</Text>
            <Text style={styles.value}>{requisition.requestedBy}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {requisition.requestDate.toDate().toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Products Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Product</Text>
            <Text style={styles.col2}>Requested</Text>
            {(requisition.status === 'Confirmed' || requisition.status === 'Approved') && (
              <Text style={styles.col3}>Approved</Text>
            )}
            {requisition.status === 'Issued' && (
              <Text style={styles.col4}>Issued</Text>
            )}
          </View>
          {requisition.products.map((product) => (
            <View key={product.productId} style={styles.tableRow}>
              <Text style={styles.col1}>{product.name}</Text>
              <Text style={styles.col2}>
                {product.requestedQuantity} {product.unit}
              </Text>
              {(requisition.status === 'Confirmed' || requisition.status === 'Approved') && (
                <Text style={styles.col3}>
                  {product.approvedQuantity || product.requestedQuantity} {product.unit}
                  {product.approvalNotes && (
                    <Text style={styles.notes}>{'\n'}{product.approvalNotes}</Text>
                  )}
                </Text>
              )}
              {requisition.status === 'Issued' && requisition.issuedProducts && (
                <Text style={styles.col4}>
                  {requisition.issuedProducts.find(p => p.productId === product.productId)?.issuedQuantity || 0} {product.unit}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Approval Information */}
        {requisition.status !== 'Pending' && (
          <View style={styles.approvalSection}>
            {requisition.confirmedBy && (
              <View style={styles.row}>
                <Text style={styles.label}>Confirmed By:</Text>
                <View style={styles.value}>
                  <Text>{requisition.confirmedBy}</Text>
                  {requisition.approver1Comments && (
                    <Text style={styles.notes}>Note: {requisition.approver1Comments}</Text>
                  )}
                </View>
              </View>
            )}
            {requisition.approvedBy && (
              <View style={styles.row}>
                <Text style={styles.label}>Approved By:</Text>
                <View style={styles.value}>
                  <Text>{requisition.approvedBy}</Text>
                  {requisition.approver2Comments && (
                    <Text style={styles.notes}>Note: {requisition.approver2Comments}</Text>
                  )}
                </View>
              </View>
            )}
            {requisition.issuedBy && (
              <View style={styles.row}>
                <Text style={styles.label}>Issued By:</Text>
                <View style={styles.value}>
                  <Text>{requisition.issuedBy}</Text>
                </View>
              </View>
            )}
            {(requisition as any).receivedBy && (
              <View style={styles.row}>
                <Text style={styles.label}>Issued To:</Text>
                <View style={styles.value}>
                  <Text>{(requisition as any).receivedBy}</Text>
                </View>
              </View>
            )}
            {(requisition.finalReceivedBy || (requisition as any).receivedBy) && (
              <View style={styles.row}>
                <Text style={styles.label}>Received By:</Text>
                <View style={styles.value}>
                  <Text>{requisition.finalReceivedBy || (requisition as any).receivedBy}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Requested By</Text>
            <Text style={styles.signatureDate}>Date: _____________</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Approved By</Text>
            <Text style={styles.signatureDate}>Date: _____________</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Received By</Text>
            <Text style={styles.signatureDate}>Date: _____________</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Approved':
      return '#dcfce7';
    case 'Rejected':
      return '#fee2e2';
    default:
      return '#dbeafe';
  }
}; 