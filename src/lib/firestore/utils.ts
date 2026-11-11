/**
 * FirebaseのDocumentSnapshotまたはオブジェクトをプレーンなオブジェクトに変換する
 * Timestampをミリ秒数値にシリアライズしてServer Component -> Client Component境界の安全性を確保
 */
export const toPlainObject = <T = any>(doc: any): T => {
  if (!doc) return doc;
  const data = typeof doc.data === "function" ? doc.data() : doc;
  const obj = { ...data, ...(doc.id ? { id: doc.id } : {}) };

  const convertTimestamps = (item: any): any => {
    if (!item || typeof item !== "object") return item;

    if (typeof item.toMillis === "function") {
      return item.toMillis();
    }
    if (item instanceof Date) {
      return item.getTime();
    }

    if (Array.isArray(item)) {
      return item.map(convertTimestamps);
    }

    const result: any = {};
    for (const key in item) {
      result[key] = convertTimestamps(item[key]);
    }
    return result;
  };

  return convertTimestamps(obj);
};

