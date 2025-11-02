#!/bin/bash
cd /Users/zadongqi/N.Nick/ESSU/web/src/pages
sed -i '' 's/const { products, filteredProducts, setFilteredProducts, loading, loadProducts, pagination, setPagination } = useMaterials();/const { materials, filteredMaterials, setFilteredMaterials, loading, loadMaterials, pagination, setPagination } = useMaterials();/g' Material.jsx
sed -i '' 's/const totalStock = (products || \[\]).reduce((sum, product) => sum + (product.stock_count || 0), 0);/const totalStock = (materials || []).reduce((sum, material) => sum + (material.stock_count || 0), 0);/g' Material.jsx
sed -i '' 's/const totalValue = (products || \[\]).reduce((sum, product) => sum + ((product.out_price || 0) \* (product.stock_count || 0)), 0);/const totalValue = (materials || []).reduce((sum, material) => sum + ((material.out_price || 0) * (material.stock_count || 0)), 0);/g' Material.jsx
sed -i '' 's/loadProducts(message.error);/loadMaterials(message.error);/g' Material.jsx
sed -i '' 's/const getFilteredProducts = () => filteredProducts.filter(product =>/const getFilteredMaterials = () => filteredMaterials.filter(material =>/g' Material.jsx
sed -i '' 's/if (searchKeywords.length > 0 && !searchKeywords.includes(product.name)) return false;/if (searchKeywords.length > 0 \&\& !searchKeywords.includes(material.name)) return false;/g' Material.jsx
sed -i '' 's/if (stockFilter === '\''zero'\'' && product.stock_count > 0) return false;/if (stockFilter === '\''zero'\'' \&\& material.stock_count > 0) return false;/g' Material.jsx
sed -i '' 's/if (stockFilter === '\''low'\'' && product.stock_count > 5) return false;/if (stockFilter === '\''low'\'' \&\& material.stock_count > 5) return false;/g' Material.jsx
sed -i '' 's/if (stockFilter === '\''normal'\'' && product.stock_count <= 5) return false;/if (stockFilter === '\''normal'\'' \&\& material.stock_count <= 5) return false;/g' Material.jsx
sed -i '' 's/if (referenceFilter === '\''zero'\'' && (product.used_by_products || 0) > 0) return false;/if (referenceFilter === '\''zero'\'' \&\& (material.used_by_products || 0) > 0) return false;/g' Material.jsx
sed -i '' 's/if (referenceFilter === '\''used'\'' && (product.used_by_products || 0) === 0) return false;/if (referenceFilter === '\''used'\'' \&\& (material.used_by_products || 0) === 0) return false;/g' Material.jsx
sed -i '' 's/setFilteredProducts(products);/setFilteredMaterials(materials);/g' Material.jsx
sed -i '' 's/}, \[products\]);/}, [materials]);/g' Material.jsx
sed -i '' 's/value={products ? products.length : 0}/value={materials ? materials.length : 0}/g' Material.jsx
sed -i '' 's/const product = products.find(p => p.name === option.value);/const material = materials.find(m => m.name === option.value);/g' Material.jsx
sed -i '' 's/return product && product.name.toLowerCase().includes(input.toLowerCase());/return material \&\& material.name.toLowerCase().includes(input.toLowerCase());/g' Material.jsx
sed -i '' 's/{products.map((product, index) =>/{materials.map((material, index) =>/g' Material.jsx
sed -i '' 's/key={`search-${product.id}-${index}`}/key={`search-${material.id}-${index}`}/g' Material.jsx
sed -i '' 's/value={product.name}/value={material.name}/g' Material.jsx
sed -i '' 's/{product.image_path ?/{material.image_path ?/g' Material.jsx
sed -i '' 's/src={`http:\/\/localhost:5274\/${product.image_path}`}/src={`http:\/\/localhost:5274\/${material.image_path}`}/g' Material.jsx
sed -i '' 's/<span>{product.name}<\/span>/<span>{material.name}<\/span>/g' Material.jsx
sed -i '' 's/<div>{product.name}<\/div>/<div>{material.name}<\/div>/g' Material.jsx
sed -i '' 's/库存: {product.stock_count}/库存: {material.stock_count}/g' Material.jsx
sed -i '' 's/getFilteredProducts()/getFilteredMaterials()/g' Material.jsx
sed -i '' 's/const product = products.find(p => p.id === materialId);/const material = materials.find(m => m.id === materialId);/g' Material.jsx
sed -i '' 's/return product ?/return material ?/g' Material.jsx
sed -i '' 's/{product.image_path ?/{material.image_path ?/g' Material.jsx
sed -i '' 's/alt={product.name}/alt={material.name}/g' Material.jsx
sed -i '' 's/<strong>{product.name}<\/strong>/<strong>{material.name}<\/strong>/g' Material.jsx
