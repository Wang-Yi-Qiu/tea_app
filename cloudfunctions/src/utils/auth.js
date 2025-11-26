// cloud/functions/src/utils/auth.js
const cloud = require('wx-server-sdk').init()

class AuthMiddleware {
  static async required(event, context) {
    const { OPENID } = cloud.getWXContext()

    if (!OPENID) {
      return {
        errcode: -3,
        errmsg: '需要用户登录'
      }
    }

    // 添加用户信息到请求对象
    event.user = {
      _openid: OPENID
    }

    return OPENID
  }

  static async admin(event, context) {
    const { OPENID } = cloud.getWXContext()

    if (!OPENID) {
      return {
        errcode: -3,
        errmsg: '需要管理员登录'
      }
    }

    // TODO: 检查管理员权限
    const db = cloud.database()
    const adminUser = await db.collection('admin_users')
      .where({
        _openid: OPENID,
        status: 'active'
      })
      .get()

    if (!adminUser.data.length) {
      return {
        errcode: -3,
        errmsg: '权限不足'
      }
    }

    // 添加管理员信息到请求对象
    event.admin = adminUser.data[0]

    return OPENID
  }

  static async optional(event, context) {
    const { OPENID } = cloud.getWXContext()

    if (!OPENID) {
      return {
        errcode: -3,
        errmsg: '需要用户登录'
      }
    }

    // 添加用户信息到请求对象
    event.user = {
      _openid: OPENID
    }

    return null // 验证通过
  }
}

module.exports = AuthMiddleware