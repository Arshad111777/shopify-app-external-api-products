import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useFetcher, useLoaderData } from "react-router";


export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const response = await fetch("https://fakestoreapi.com/products/");
    if (!response.ok) {
        throw new Response("Failed to fetch products", { status: 500 });
    }
    const products = await response.json();
    return { products };
}



export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const productData = JSON.parse(form.get("product"));


  const resp = await admin.graphql(
    `#graphql
    mutation CreateProductWithNewMedia($product: ProductCreateInput!, $media: [CreateMediaInput!]!) {
    
    productCreate(product: $product, media: $media) {
    product {
     id
     title
     media(first: 10){
     nodes{
      alt
      mediaContentType
      preview { status }
     }
     }
    }

    userErrors { field message}
    
    }

    }`,

    {
      variables: {
        product: {
          title: productData.title,
          descriptionHtml: productData.description,
          productType: productData.category,
          status: "ACTIVE",
        },
        media: [
          {
            originalSource: productData.image,
            alt: productData.title,
            mediaContentType: "IMAGE",
          }
        ]
      }
    }


  )

  const json = await resp.json();
  return json;

}





export default function Products() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  if(fetcher.data?.data?.productCreate?.product?.id)shopify.toast.show('Product Successfully imported', { duration: 2000});

  if(fetcher.data?.data?.productCreate?.userErrors?.length)
    shopify.toast.show(fetcher.data.data.productCreate.userErrors[0].message, { tone: "critical" });


  const importProduct = p => {
    fetcher.submit({ product: JSON.stringify(p) },
      { method: "post" }
    )
  }

  return (
    <s-page title="Products" inlineSize="base">
      <s-section heading="External API Products">
        <s-stack gap="large">
          <s-text type="heading-md">Recommended products</s-text>

          <s-stack gap="base">
            <s-skeleton-body-text></s-skeleton-body-text>
            <s-skeleton-body-text></s-skeleton-body-text>
          </s-stack>

          <s-query-container>
            <s-grid
              gap="base"
              gridTemplateColumns="repeat(4, 1fr)"
            >
                {products.map((product)=>(
                     <>
                     <s-grid-item key={product.id}>
                <s-box padding="base" border="base" borderRadius="base">
                  <s-stack gap="base">
                    <s-box aspectRatio="1" background="subdued" padding="small" justifyContent="center" alignItems="center">
                     <s-thumbnail
                        src={product.image}
                        alt={product.title}
                        size="large"
                      />
                    </s-box>

                    <s-chip
                      color="strong"
                      accessibilityLabel="Product category"
                    >
                      <s-icon
                        slot="graphic"
                        type="product-add"
                        size="small"
                      />
                      {product.category}
                    </s-chip>

                    <s-text>{product.title}</s-text>
                    <s-paragraph color="subdued">
                      {product.description.length > 100
                        ? product.description.substring(0, 100) + "..."
                        : product.description}
                    </s-paragraph>
                    <s-text type="heading-sm">
                      ₹{product.price.toFixed(2)}
                    </s-text>
                    <s-text tone="subdued">
                      ⭐ {product.rating.rate} + {product.rating.count} reviews
                    </s-text>
                    <s-button variant="primary"
                    loading={
                      fetcher.state === "submitting" &&
                      fetcher.formData?.get("product") === JSON.stringify(product)
                    }
                    onClick={()=> importProduct(product)}
                    >Import Product</s-button>
                  </s-stack>
                </s-box>
              </s-grid-item>
                     </>
                ))}
              

              
            </s-grid>
          </s-query-container>
        </s-stack>
      </s-section>
    </s-page>
  );
}
