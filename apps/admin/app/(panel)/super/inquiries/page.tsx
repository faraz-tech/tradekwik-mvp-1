"use client";

import { useEffect, useState } from "react";
import type { AdminInquiryDto } from "@tradekwik/shared";
import { adminListInquiries } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<AdminInquiryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminListInquiries()
      .then(setInquiries)
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">All inquiries</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading inquiries…</p>
      ) : inquiries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inquiries yet.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell>
                    <p className="font-medium">{inquiry.buyerName}</p>
                    <p className="text-xs text-muted-foreground">{inquiry.buyerPhone}</p>
                  </TableCell>
                  <TableCell>{inquiry.sellerName}</TableCell>
                  <TableCell className="max-w-48 truncate">
                    {inquiry.productName ?? (
                      <span className="text-muted-foreground">Store inquiry</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(inquiry.createdAt)}</TableCell>
                  <TableCell className="capitalize">{inquiry.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
