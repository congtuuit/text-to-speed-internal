# SKILL: skate-component-creator
Name: Skate Component Creator
Description: Tạo Sitecore Next.js Component theo chuẩn dự án Skate Park.
Command: /component

## 📝 Component Template Structure:
Tất cả các component mới được tạo qua lệnh `/component` PHẢI tuân thủ cấu trúc sau:

```tsx
'use client';

import React, { JSX } from 'react';
import { Field, Text, RichText, Image, Link, LinkField, ImageField } from "@sitecore-content-sdk/nextjs";

interface Fields {
  Title: Field<string>;
  // Thêm các fields khác ở đây
}

type [ComponentName]Props = {
  params: { [key: string]: string };
  fields: Fields;
};

export const Default = (props: [ComponentName]Props): JSX.Element => {
  const { fields } = props;
  const styles = `${props.params.GridParameters || ''} ${props.params.styles || ''}`.trim();

  return (
    <div className={`component [component-css-class] ${styles}`}>
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold">
          <Text field={fields?.Title} defaultValue="[ComponentName] Default Title" />
        </h2>
        {/* Nội dung component */}
      </div>
    </div>
  );
};

export default Default;
```

## 🚀 Workflow khi nhận lệnh `/component [Name]`:
1. **Phân tích tên**: Chuyển đổi [Name] sang PascalCase (ví dụ: `skate-banner` -> `SkateBanner`).
2. **Tạo file**: Tạo file tại `src/components/[ComponentName]/[ComponentName].tsx`.
3. **Generate Code**: Sử dụng template trên để tạo mã nguồn.
4. **Sitecore Reminder (BẮT BUỘC)**: Sau khi tạo code, AI phải hiển thị thông báo yêu cầu người dùng cấu hình Rendering trên Sitecore.

## ⚠️ Sitecore Configuration Instruction:
AI phải nhắc user thực hiện bước này:
"🔔 **Sitecore Reminder**: Anh nhớ tạo một **Json Rendering** trong Sitecore tại `/sitecore/layout/Renderings/Project/...` với:
- **Component Name**: [ComponentName]
- **Datasource Location**: (Tùy chọn)
- **Datasource Template**: (Tùy chọn)"
