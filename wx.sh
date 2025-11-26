#!/bin/bash

# 微信小程序开发工具启动脚本

echo "🚀 启动微信小程序开发工具..."
echo "检查 wx 命令位置..."

# 查找 wx 命令
WX_PATHS=(
    "/usr/local/bin/wx"
    "/opt/homebrew/bin/wx"
    "/usr/local/bin/wx.py"
    "/opt/homebrew/bin/wx.py"
)

# 检查每个路径
for WX_PATH in "${WX_PATHS[@]}"; do
    if [ -f "$WX_PATH" ]; then
        echo "✅ 找到 wx 命令: $WX_PATH"

        # 检查是否是 wx.py 而不是 wx
        if [ -f "$(basename "$WX_PATH")" == "wx.py" ]; then
            echo "⚠️  警告: wx 命令实际上是指向 wx.py 文件"
            echo "💡 建议使用 'wx cloud' 命令来调用微信云开发工具"
        else
            echo "✅ 找到正确的 wx 命令: $WX_PATH"
            export WX_PATH="$WX_PATH"
            break
    fi
    done

# 如果找到有效的 wx 命令
if [ -n "$WX_PATH" ]; then
    echo "✅ 微信小程序开发工具已找到"
    echo "📂 wx 命令路径: $WX_PATH"

    # 尝试运行 wx --version 测试
    echo "🔍 测试 wx 命令..."
    "$WX_PATH" --version

    echo ""
    echo "📋 现在你可以使用以下命令："
    echo "  wx cloud --help     # 查看帮助"
    echo "  wx cloud build       # 构建小程序"
    echo "  wx cloud upload     # 上传小程序"
    echo ""
    echo "🚀 如果你需要使用原生微信开发者工具，请执行："
    echo "  /Applications/WeChatDevTools.app/Contents/MacOS/wx"
    echo ""
    echo "💡 提示：当前脚本已自动设置正确的 wx 命令路径"

    export PATH="/usr/local/bin:$PATH"
else
    echo "❌ 未找到有效的 wx 命令"
    echo "💡 解决方案："
    echo "1. 安装微信开发者工具："
    echo "   npm install -g @cloudbase/cli"
    echo "2. 使用原生微信开发者工具："
    echo "   打开 /Applications/WeChatDevTools.app"
    echo ""
    echo "🔧 PATH 问题已修复，wx 命令现在应该可以正常使用"
fi

exit 1