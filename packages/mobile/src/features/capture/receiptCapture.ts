import * as ImagePicker from 'expo-image-picker';

export interface ReceiptCaptureResult {
  uri: string;
  mimeType: string;
  filename: string;
}

export async function requestCameraPermission(): Promise<boolean> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return permission.granted;
}

export async function captureReceipt(): Promise<ReceiptCaptureResult | null> {
  const granted = await requestCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.9,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  });

  if (result.canceled || !result.assets.length) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    filename: asset.fileName ?? `receipt-${Date.now()}.jpg`,
  };
}
