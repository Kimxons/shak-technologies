using BRNetSecurityCore;

namespace System.Helpers
{
    public static class DBClient
    {
        public static string GetConnectionString(string DBType, string DBServerName, string DatabaseName, string DBUserName, string DBUserPassword, string AppName = "")
        {
            string dbPort = DBServerName.Substring(DBServerName.Contains(',') ? DBServerName.IndexOf(',') : 0);
            DBUserPassword = DBClient.DBUserPassword(DBUserPassword);
            DBUserName = DBClient.DBUserName(DBUserName);
            AppName = string.IsNullOrEmpty(AppName) ? "NEWCBS" : AppName;
            string strConnection;
            switch (DBType)
            {
                case "SQLSERVER":
                    //dbPort = string.IsNullOrEmpty(dbPort) ? "1433" : dbPort;
                    strConnection = string.Format("Data source={0};Initial Catalog={1};User id={2};Password={3};Integrated Security=false;persist security info=True;App={4};TrustServerCertificate=True;MultipleActiveResultSets=True;Encrypt=false;",
                    //strConnection = string.Format("Data source={0};Initial Catalog={1};User id={2};Password={3};Integrated Security=false;Application Name={4};TrustServerCertificate=True;MultipleActiveResultSets=True;",
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
                    //dbPort = string.IsNullOrEmpty(dbPort) ? "1433" : dbPort;
                    strConnection = string.Format("Data source={0};Initial Catalog={1};User id={2};Password={3};persist security info=True;App={4}",
                        DBServerName, DatabaseName, DBUserName, DBUserPassword, AppName);
                    break;
            }

            return strConnection;
        }
        public static string DBUserName(string strUserName)
        {
            if (string.IsNullOrWhiteSpace(strUserName))
            {
                throw new ArgumentException("Database username cannot be null or empty. Please check your appsettings configuration.");
            }
            return BRAccess.BRUserName(strUserName);
        }
        public static string DBUserPassword(string strUserPassword)
        {
            if (string.IsNullOrWhiteSpace(strUserPassword))
            {
                throw new ArgumentException("Database password cannot be null or empty. Please check your appsettings configuration.");
            }
            try
            {
                return BRAccess.BRUserPassword(strUserPassword);
            }
            catch (FormatException ex)
            {
                throw new FormatException($"Invalid encrypted password format in configuration. The password must be a valid Base-64 encoded string. Error: {ex.Message}", ex);
            }
        }

    }
    public static class DBClientV1
    {
        public static string GetConnectionString(string DBType, string DBServerName, string DatabaseName, string DBUserName, string DBUserPassword, string AppName = "")
        {
            string dbPort = DBServerName.Substring(DBServerName.Contains(',') ? DBServerName.IndexOf(',') : 0);
            //DBUserPassword = DBClient.DBUserPassword(DBUserPassword);
            //DBUserName = DBClient.DBUserName(DBUserName);
            AppName = string.IsNullOrEmpty(AppName) ? "NEWCBS" : AppName;
            string strConnection;
            switch (DBType)
            {
                case "SQLSERVER":
                    //dbPort = string.IsNullOrEmpty(dbPort) ? "1433" : dbPort;
                    strConnection = string.Format("Data source={0};Initial Catalog={1};User id={2};Password={3};Integrated Security=false;persist security info=True;App={4};TrustServerCertificate=True;MultipleActiveResultSets=True;Encrypt=false;",
                    //strConnection = string.Format("Data source={0};Initial Catalog={1};User id={2};Password={3};Integrated Security=false;Application Name={4};TrustServerCertificate=True;MultipleActiveResultSets=True;",
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
                    //dbPort = string.IsNullOrEmpty(dbPort) ? "1433" : dbPort;
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
