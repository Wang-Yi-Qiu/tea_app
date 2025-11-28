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
    // 模拟产品数据
    const mockProducts = [
      {
        id: '1',
        name: '龙井明前茶',
        category: 'green_tea',
        price: '268',
        originalPrice: '328',
        image: '/images/longjing-tea.jpg',
        description: '西湖龙井，明前采摘，清香怡人',
        stock: 50,
        sales: 128,
        rating: 4.9,
        tags: ['明前茶', '清香', '热销'],
        createTime: new Date('2024-03-01').getTime()
      },
      {
        id: '2',
        name: '武夷山大红袍',
        category: 'rock_tea',
        price: '388',
        originalPrice: '468',
        image: '/images/dahongpao-tea.jpg',
        description: '武夷岩茶，岩韵悠长，回味无穷',
        stock: 30,
        sales: 86,
        rating: 4.8,
        tags: ['岩茶', '武夷山', '经典'],
        createTime: new Date('2024-03-02').getTime()
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

    // 排序
    filteredProducts.sort((a, b) => {
      const aValue = sortField === 'price' ? parseFloat(a[sortField]) : a[sortField]
      const bValue = sortField === 'price' ? parseFloat(b[sortField]) : b[sortField]

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
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