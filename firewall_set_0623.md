# WSL2 端口转发开关

> 用于手机访问 WSL2 服务（Flask :5000），按需开启/关闭。

---

## 🔓 打开（手机可访问）

以**管理员身份**打开 PowerShell，依次执行：

```powershell
# 1. 端口转发：Windows → WSL2
netsh interface portproxy add v4tov4 listenport=5000 listenaddress=192.168.1.6 connectport=5000 connectaddress=172.17.165.21

# 2. 防火墙放行
netsh advfirewall firewall add rule name="WSL2 Fitness 5000" dir=in action=allow protocol=TCP localport=5000
```

打开后手机访问：`http://192.168.1.6:5000`

---

## 🔒 关闭（仅本机可访问）

以**管理员身份**打开 PowerShell：

**第 0 步：先看一眼当前转发规则**（listenaddress 可能是 `0.0.0.0` 也可能是 `192.168.1.6`）

```powershell
netsh interface portproxy show all
```

**然后根据看到的 listenaddress 选择对应的删除命令：**

```powershell
# 如果 listenaddress 是 0.0.0.0，用这条：
netsh interface portproxy delete v4tov4 listenport=5000 listenaddress=0.0.0.0

# 如果 listenaddress 是 192.168.1.6，用这条：
netsh interface portproxy delete v4tov4 listenport=5000 listenaddress=192.168.1.6
```

**最后删除防火墙规则：**

```powershell
netsh advfirewall firewall delete rule name="WSL2 Fitness 5000"
```

---

## 📋 查看当前状态

```powershell
# 查看端口转发
netsh interface portproxy show all

# 查看防火墙规则
netsh advfirewall firewall show rule name="WSL2 Fitness 5000"
```
