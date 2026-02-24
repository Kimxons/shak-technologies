using BRNetSecurityCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AccountManagement.Helpers
{
    public static class DBClient
    {
        public static string GetConnectionString(string DBType, string DBServerName, string DatabaseName, string DBUserName, string DBUserPassword, string AppName = "")
        {
            string dbPort = DBServerName.Substring(DBServerName.Contains(',') ? DBServerName.IndexOf(',') : 0);
            DBUserPassword = DBClient.DBUserPassword(DBUserPassword);
            DBUserName = DBClient.DBUserName(DBUserName);
            AppName = string.IsNullOrEmpty(AppName) ? "BREmailing" : AppName;
            string strConnection;
            switch (DBType)
            {
                case "SQLSERVER":
                    strConnection = string.Format("Data source={0};Initial Catalog={1};User id={2};Password={3};Integrated Security=false;persist security info=True;App={4};TrustServerCertificate=True;MultipleActiveResultSets=True;Encrypt=false;",
                        DBServerName, DatabaseName, DBUserName, DBUserPassword, AppName);
                    break;
                case "MYSQL":
                    dbPort = string.IsNullOrEmpty(dbPort) ? "3306" : dbPort;
                    strConnection = string.Format("Server={0};Database={1};Uid={2};pwd={3};port={4};",
                        DBServerName, DatabaseName, DBUserName, DBUserPassword, dbPort);
                    break;
                case "ORACLE":
                    strConnection = string.Format("Data Source={0};user ID={1};password={2};",
                       DatabaseName, DBUserName, DBUserPassword);
                    break;
                default:
                    strConnection = string.Format("Data source={0};Initial Catalog={1};User id={2};Password={3};persist security info=True;App={4}",
                        DBServerName, DatabaseName, DBUserName, DBUserPassword, AppName);
                    break;
            }

            return strConnection;
        }
        public static string DBUserName(string strUserName)
        {
            return BRAccess.BRUserName(strUserName);
        }
        public static string DBUserPassword(string strUserPassword)
        {
            return BRAccess.BRUserPassword(strUserPassword);
        }
    }
}
