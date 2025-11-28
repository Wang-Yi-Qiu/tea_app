// 云函数入口文件 - 获取产品列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 获取产品列表云函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const {
    category,
    keyword,
    page = 1,
    pageSize = 20,
    sortField = 'createTime',
    sortOrder = 'desc'
  } = event

  try {
    // 完整的茶叶产品数据
    const mockProducts = [
      {
        id: '1',
        name: '西湖龙井 明前特级',
        category: 'green_tea',
        price: 268,
        originalPrice: 328,
        image: 'https://img.q1.com/aias_public/AB6AXuCTd2UAHGIhCUG1vu7Gi4F_Q65voh302jP_S7FCyUZEN6owL-Wa74KtTzX8Ap6wGM3pQJR9GGz2sEcyUvYE1xW6bGi3CeQnw6hA2i8Lf4cHgQoMszN0TvO2qg268ckmaYcTCSMQ7ByEWsdH_SXcJQp8wvjI9LAs34FzFURnyIyZL7f58nSI5OiTZRqjfF_iXxjUqRoQl328NCaXOADVxbda6wCYiVKJzhFG1f8KCpIBFdBcEahc2aKMVTrqqDte5JlqvqsKRS1i145',
        description: '西湖龙井核心产区，明前嫩芽采摘，传统手工炒制，色泽翠绿，香气清高持久，滋味鲜爽甘醇',
        stock: 50,
        sales: 128,
        rating: 4.9,
        tags: ['明前茶', '西湖龙井', '手工炒制', '特级'],
        createTime: new Date('2024-03-01').getTime(),
        specs: {
          materials: [
            { id: 'm1', name: '明前嫩芽' },
            { id: 'm2', name: '一芽一叶' }
          ],
          capacities: [
            { id: 'c1', name: '100g', price: 268 },
            { id: 'c2', name: '250g', price: 628 },
            { id: 'c3', name: '500g', price: 1188 }
          ],
          grades: [
            { id: 'g1', name: '特级' },
            { id: 'g2', name: '一级' }
          ]
        }
      },
      {
        id: '2',
        name: '武夷山正岩大红袍',
        category: 'rock_tea',
        price: 388,
        originalPrice: 468,
        image: 'https://img.q1.com/aias_public/AB6AXuCpAb69bK6L2ZgyqTo_DMKpukWZLkyh8bSd6KGUwlL3DWvjLvxbGINcpzmpQwDVd3ynk_ReLcyMiHnSUGWA_nK6gcArggdh4gEqGK2a8S1PvM5kNOzOaomuBc4PXE_3YrhCkvS5aWyrQao1ReIfiRcZDU0b-lQrNbmtDpA_ypPKz6k_Lzt-9ZYMSyvfaN31Vh5loQ1u4efmCDtjbdrrvdtys8W0n-1nWADgszHpfLw4LgJBYEVML1zms6KxkFoKZl_vt5yfSFEn7-',
        description: '武夷山正岩产区，传统炭焙工艺，岩韵明显，汤色橙红明亮，滋味醇厚回甘',
        stock: 30,
        sales: 86,
        rating: 4.8,
        tags: ['正岩茶', '武夷山', '传统炭焙', '岩韵'],
        createTime: new Date('2024-03-02').getTime(),
        specs: {
          materials: [
            { id: 'm1', name: '正岩' },
            { id: 'm2', name: '半岩' }
          ],
          capacities: [
            { id: 'c1', name: '100g', price: 388 },
            { id: 'c2', name: '250g', price: 888 },
            { id: 'c3', name: '500g', price: 1688 }
          ],
          grades: [
            { id: 'g1', name: '特级' },
            { id: 'g2', name: '一级' }
          ]
        }
      },
      {
        id: '3',
        name: '安溪铁观音',
        category: 'oolong_tea',
        price: 198,
        originalPrice: 258,
        image: 'https://img.q1.com/aias_public/AB6AXuB89vIh3yz-PwhEMUDDB5k5TftZhPeIxy8EWf1mGuCr3bXQ8Hw8ZqrJEkF2Dhxj3VeG1RGLhjXShWK9psutfWn3bPHWd8QDTTnqe-xCsBmcFVYE6jFLhkdtIGrE1-RzPe8Aug-1xf-tF4M1tsZHYuPpXXg7coqwM9DlayNLBm5OyTuzEMwtVUywBnhBaA6xNjkziYRMLQ99HMdKQYScD9ZcQle3fRByCemC0JCeemw4BMprafFM99pNYE3Qm-cmAPXANOoR3bIyMWGi',
        description: '安溪核心产区，传统发酵工艺，颗粒紧结重实，色泽砂绿油润，香气清高持久，滋味鲜醇甘爽',
        stock: 80,
        sales: 156,
        rating: 4.7,
        tags: ['安溪铁观音', '传统工艺', '韵香', '鲜醇'],
        createTime: new Date('2024-03-03').getTime(),
        specs: {
          materials: [
            { id: 'm1', name: '正味' },
            { id: 'm2', name: '清香' }
          ],
          capacities: [
            { id: 'c1', name: '100g', price: 198 },
            { id: 'c2', name: '250g', price: 468 },
            { id: 'c3', name: '500g', price: 888 }
          ],
          grades: [
            { id: 'g1', name: '特级' },
            { id: 'g2', name: '一级' }
          ]
        }
      },
      {
        id: '4',
        name: '云南普洱熟茶',
        category: 'puer_tea',
        price: 168,
        originalPrice: 208,
        image: 'https://img.q1.com/aias_public/AB6AXuAfTRk61s7qpsRFNCsuN3kIme7SRxnC9Z-W3_NBO5MZZnV35sqIvYFXAfc-sBibJn4LRkopjWHZ37tCCKY7o65GZAEq-TVnHnlKoWzG2vt0FlckT_zV0BjAS-Da4FYi7AZtMSAlnRU5N-Ld0OhonwffruKXC6xhmutDk6qhYBnRnrXh8u6H-z3k1UX6t8pqLasasnyGA-gl90_jxrEiMaijtQkQ7oxsSK4nHD7orNR8buKAr-hHVxK1pWRcEk0n55pFfKWOvPGQqc4',
        description: '云南大叶种晒青毛茶，渥堆发酵工艺，色泽红褐油润，陈香明显，滋味醇厚回甘',
        stock: 120,
        sales: 203,
        rating: 4.6,
        tags: ['云南普洱', '熟茶', '渥堆发酵', '陈香'],
        createTime: new Date('2024-03-04').getTime(),
        specs: {
          materials: [
            { id: 'm1', name: '宫廷料' },
            { id: 'm2', name: '等级料' }
          ],
          capacities: [
            { id: 'c1', name: '100g', price: 168 },
            { id: 'c2', name: '357g', price: 588 },
            { id: 'c3', name: '500g', price: 788 }
          ],
          grades: [
            { id: 'g1', name: '特级' },
            { id: 'g2', name: '一级' }
          ]
        }
      },
      {
        id: '5',
        name: '黄山毛峰',
        category: 'green_tea',
        price: 228,
        originalPrice: 288,
        image: 'https://img.q1.com/aias_public/AB6AXuCpAb69bK6L2ZgyqTo_DMKpukWZLkyh8bSd6KGUwlL3DWvjLvxbGINcpzmpQwDVd3ynk_ReLcyMiHnSUGWA_nK6gcArggdh4gEqGK2a8S1PvM5kNOzOaomuBc4PXE_3YrhCkvS5aWyrQao1ReIfiRcZDU0b-lQrNbmtDpA_ypPKz6k_Lzt-9ZYMSyvfaN31Vh5loQ1u4efmCDtjbdrrvdtys8W0n-1nWADgszHpfLw4LgJBYEVML1zms6KxkFoKZl_vt5yfSFEn7-',
        description: '黄山核心产区，传统手工制作，外形微卷匀整，色泽翠绿油润，香气清高持久，滋味鲜醇回甘',
        stock: 60,
        sales: 92,
        rating: 4.8,
        tags: ['黄山毛峰', '传统工艺', '鲜醇回甘', '名优绿茶'],
        createTime: new Date('2024-03-05').getTime(),
        specs: {
          materials: [
            { id: 'm1', name: '毛峰' },
            { id: 'm2', name: '雀舌' }
          ],
          capacities: [
            { id: 'c1', name: '100g', price: 228 },
            { id: 'c2', name: '250g', price: 538 },
            { id: 'c3', name: '500g', price: 1038 }
          ],
          grades: [
            { id: 'g1', name: '特级' },
            { id: 'g2', name: '一级' }
          ]
        }
      },
      {
        id: '6',
        name: '祁门红茶',
        category: 'black_tea',
        price: 188,
        originalPrice: 238,
        image: 'https://img.q1.com/aias_public/AB6AXuCpAb69bK6L2ZgyqTo_DMKpukWZLkyh8bSd6KGUwlL3DWvjLvxbGINcpzmpQwDVd3ynk_ReLcyMiHnSUGWA_nK6gcArggdh4gEqGK2a8S1PvM5kNOzOaomuBc4PXE_3YrhCkvS5aWyrQao1ReIfiRcZDU0b-lQrNbmtDpA_ypPKz6k_Lzt-9ZYMSyvfaN31Vh5loQ1u4efmCDtjbdrrvdtys8W0n-1nWADgszHpfLw4LgJBYEVML1zms6KxkFoKZl_vt5yfSFEn7-',
        description: '祁门传统产区，传统发酵工艺，条索紧细匀整，色泽乌润，香气清香持久，滋味醇厚回甘',
        stock: 75,
        sales: 118,
        rating: 4.6,
        tags: ['祁门红茶', '传统工艺', '清香持久', '醇厚回甘'],
        createTime: new Date('2024-03-06').getTime(),
        specs: {
          materials: [
            { id: 'm1', name: '工夫红茶' },
            { id: 'm2', name: '小种红茶' }
          ],
          capacities: [
            { id: 'c1', name: '100g', price: 188 },
            { id: 'c2', name: '250g', price: 438 },
            { id: 'c3', name: '500g', price: 828 }
          ],
          grades: [
            { id: 'g1', name: '特级' },
            { id: 'g2', name: '一级' }
          ]
        }
      },
      {
        id: '7',
        name: '福鼎白茶白牡丹',
        category: 'white_tea',
        price: 158,
        originalPrice: 198,
        image: 'https://img.q1.com/aias_public/AB6AXuB5xAfo3d8GtqJYKwiLEvmVtDd8JLX-9L56PBFkb6Ulrqm21gXWQe7tvW8z8MpfJIIbL-I_eS46-YsNiADHgvqC4rO5ANVl5clh-nA34iSD9A7gyhR34heiv-E_TXPN_JypxQqQvwsFSUwhnUB2CqQWT3wD5BaZ7M3TDiBNv8pqMenn3BY0L9pBZIQ_WO9Dqi_UwPqwerQ6MyeC6iC9-mgHgn4BGdilTjw2zFBD0yPZqYB9brKssSAPKMOY3DwAlI-rbQx_ELt5GJxc',
        description: '福鼎核心产区，传统萎凋工艺，叶张肥嫩，色泽灰绿，毫香明显，滋味鲜醇爽口',
        stock: 90,
        sales: 167,
        rating: 4.7,
        tags: ['福鼎白茶', '白牡丹', '传统萎凋', '毫香鲜爽'],
        createTime: new Date('2024-03-07').getTime(),
        specs: {
          materials: [
            { id: 'm1', name: '白牡丹' },
            { id: 'm2', name: '白毫银针' }
          ],
          capacities: [
            { id: 'c1', name: '100g', price: 158 },
            { id: 'c2', name: '250g', price: 358 },
            { id: 'c3', name: '500g', price: 688 }
          ],
          grades: [
            { id: 'g1', name: '特级' },
            { id: 'g2', name: '一级' }
          ]
        }
      },
      {
        id: '8',
        name: '碧螺春茶',
        category: 'green_tea',
        price: 298,
        originalPrice: 368,
        image: 'https://img.q1.com/aias_public/AB6AXuCTd2UAHGIhCUG1vu7Gi4F_Q65voh302jP_S7FCyUZEN6owL-Wa74KtTzX8Ap6wGM3pQJR9GGz2sEcyUvYE1xW6bGi3CeQnw6hA2i8Lf4cHgQoMszN0TvO2qg268ckmaYcTCSMQ7ByEWsdH_SXcJQp8wvjI9LAs34FzFURnyIyZL7f58nSI5OiTZRqjfF_iXxjUqRoQl328NCaXOADVxbda6wCYiVKJzhFG1f8KCpIBFdBcEahc2aKMVTrqqDte5JlqvqsKRS1i145',
        description: '太湖洞庭山产区，传统手工炒制，条索紧细卷曲如螺，色泽翠绿，香气清高持久，滋味鲜爽回甘',
        stock: 45,
        sales: 87,
        rating: 4.9,
        tags: ['碧螺春', '洞庭山', '传统炒制', '卷曲如螺'],
        createTime: new Date('2024-03-08').getTime(),
        specs: {
          materials: [
            { id: 'm1', name: '碧螺春' },
            { id: 'm2', name: '明前碧螺' }
          ],
          capacities: [
            { id: 'c1', name: '100g', price: 298 },
            { id: 'c2', name: '250g', price: 698 },
            { id: 'c3', name: '500g', price: 1338 }
          ],
          grades: [
            { id: 'g1', name: '特级' },
            { id: 'g2', name: '一级' }
          ]
        }
      },
      {
        id: '3',
        name: '安溪铁观音',
        category: 'oolong_tea',
        price: '198',
        originalPrice: '258',
        image: '/images/tieguanyin-tea.jpg',
        description: '福建安溪，观音韵显，七泡有余香',
        stock: 80,
        sales: 156,
        rating: 4.7,
        tags: ['乌龙茶', '观音韵', '福建'],
        createTime: new Date('2024-03-03').getTime()
      },
      {
        id: '4',
        name: '黄山毛峰',
        category: 'green_tea',
        price: '178',
        originalPrice: '228',
        image: '/images/maofeng-tea.jpg',
        description: '安徽黄山，毛峰显露，鲜爽醇厚',
        stock: 60,
        sales: 92,
        rating: 4.6,
        tags: ['绿茶', '安徽', '鲜爽'],
        createTime: new Date('2024-03-04').getTime()
      },
      {
        id: '5',
        name: '君山银针',
        category: 'white_tea',
        price: '488',
        originalPrice: '588',
        image: '/images/yinzhen-tea.jpg',
        description: '湖南岳阳，芽头肥壮，白毫显露',
        stock: 25,
        sales: 45,
        rating: 4.9,
        tags: ['白茶', '珍品', '芽头'],
        createTime: new Date('2024-03-05').getTime()
      }
    ]

    // 筛选产品
    let filteredProducts = mockProducts.filter(product => {
      if (category && product.category !== category) {
        return false
      }
      if (keyword && !product.name.includes(keyword) && !product.description.includes(keyword)) {
        return false
      }
      return true
    })

    // 排序 - 修复字符串和数值处理逻辑
    filteredProducts.sort((a, b) => {
      let aValue, bValue

      // 处理不同类型的字段
      if (sortField === 'price' || sortField === 'sales' || sortField === 'stock') {
        aValue = parseFloat(a[sortField]) || 0
        bValue = parseFloat(b[sortField]) || 0
      } else if (sortField === 'rating') {
        aValue = parseFloat(a[sortField]) || 0
        bValue = parseFloat(b[sortField]) || 0
      } else if (sortField === 'createTime') {
        aValue = new Date(a[sortField]).getTime() || 0
        bValue = new Date(b[sortField]).getTime() || 0
      } else {
        // 字符串字段
        aValue = String(a[sortField] || '')
        bValue = String(b[sortField] || '')
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : (aValue < bValue ? -1 : 0)
      } else {
        return aValue < bValue ? 1 : (aValue > bValue ? -1 : 0)
      }
    })

    // 分页
    const total = filteredProducts.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const products = filteredProducts.slice(start, end)

    return {
      errcode: 0,
      errmsg: 'ok',
      data: {
        products,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages,
        hasMore: page < totalPages
      }
    }
  } catch (error) {
    console.error('获取产品列表失败:', error)
    return {
      errcode: -1,
      errmsg: '服务器错误'
    }
  }
}